package com.rideops.multitenancy;

import static org.junit.jupiter.api.Assertions.assertTrue;

import java.lang.reflect.Method;
import java.lang.reflect.Parameter;
import java.lang.reflect.ParameterizedType;
import java.lang.reflect.Type;
import java.util.Arrays;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import org.junit.jupiter.api.Test;
import org.springframework.context.annotation.ClassPathScanningCandidateComponentProvider;
import org.springframework.core.type.filter.RegexPatternTypeFilter;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

class RepositoryTenantScopingArchitectureTest {

    private static final String BASE_PACKAGE = "com.rideops";
    private static final String TENANT_PARAM_NAME = "tenantId";

    // Legacy global methods kept intentionally (auth bootstrap/admin flows).
    private static final Map<String, Set<String>> ALLOWED_NON_TENANT_METHODS = Map.of(
        "com.rideops.identity.adapters.out.UserRepository",
        Set.of(
            "findByEmailIgnoreCase(java.lang.String)",
            "findByUserIdIgnoreCase(java.lang.String)",
            "existsByEmailIgnoreCase(java.lang.String)",
            "existsByUserIdIgnoreCase(java.lang.String)",
            "findAllByOrderByCreatedAtDesc()",
            "findAllByRoleAndEnabledTrueOrderByEmailAsc(com.rideops.identity.domain.UserRole)",
            "findAllByRoleOrderByCreatedAtDesc(com.rideops.identity.domain.UserRole)"
        )
    );

    @Test
    void tenantRepositoriesMustNotExposeNonTenantScopedMethods() throws Exception {
        List<Class<?>> tenantRepositories = scanRepositoryInterfaces().stream()
            .filter(this::isTenantScopedEntityRepository)
            .toList();

        for (Class<?> repository : tenantRepositories) {
            Set<String> allowList = ALLOWED_NON_TENANT_METHODS.getOrDefault(repository.getName(), Set.of());

            for (Method method : repository.getDeclaredMethods()) {
                if (method.isSynthetic() || method.isBridge()) {
                    continue;
                }

                String signature = signatureOf(method);
                if (allowList.contains(signature)) {
                    continue;
                }

                assertTrue(
                    isTenantScoped(method),
                    () -> "Metodo repository non tenant-scoped rilevato: "
                        + repository.getSimpleName()
                        + "."
                        + signature
                        + ". Aggiungi tenantId alla firma/query oppure registra eccezione esplicita nel test architetturale."
                );
            }
        }
    }

    private List<Class<?>> scanRepositoryInterfaces() {
        ClassPathScanningCandidateComponentProvider scanner =
            new ClassPathScanningCandidateComponentProvider(false);
        scanner.addIncludeFilter(new RegexPatternTypeFilter(java.util.regex.Pattern.compile(".*Repository")));

        List<Class<?>> repositories = new ArrayList<>();
        scanner.findCandidateComponents(BASE_PACKAGE).forEach(bean -> {
            String className = bean.getBeanClassName();
            if (className == null || className.isBlank()) {
                return;
            }
            Class<?> clazz = loadClass(className);
            if (clazz.isInterface() && JpaRepository.class.isAssignableFrom(clazz)) {
                repositories.add(clazz);
            }
        });
        return repositories;
    }

    private boolean isTenantScopedEntityRepository(Class<?> repositoryClass) {
        Class<?> entityClass = resolveJpaEntityClass(repositoryClass);
        return entityClass != null && hasTenantIdField(entityClass);
    }

    private Class<?> resolveJpaEntityClass(Class<?> repositoryClass) {
        for (Type type : repositoryClass.getGenericInterfaces()) {
            if (!(type instanceof ParameterizedType parameterizedType)) {
                continue;
            }
            Type rawType = parameterizedType.getRawType();
            if (!(rawType instanceof Class<?> rawClass)) {
                continue;
            }
            if (!JpaRepository.class.isAssignableFrom(rawClass)) {
                continue;
            }
            Type entityType = parameterizedType.getActualTypeArguments()[0];
            if (entityType instanceof Class<?> entityClass) {
                return entityClass;
            }
        }
        return null;
    }

    private boolean hasTenantIdField(Class<?> entityClass) {
        Class<?> current = entityClass;
        while (current != null && current != Object.class) {
            try {
                current.getDeclaredField(TENANT_PARAM_NAME);
                return true;
            } catch (NoSuchFieldException ignored) {
                current = current.getSuperclass();
            }
        }
        return false;
    }

    private boolean isTenantScoped(Method method) {
        if (method.getName().contains("TenantId")) {
            return true;
        }

        for (Parameter parameter : method.getParameters()) {
            if (TENANT_PARAM_NAME.equals(parameter.getName())) {
                return true;
            }
            Param param = parameter.getAnnotation(Param.class);
            if (param != null && TENANT_PARAM_NAME.equals(param.value())) {
                return true;
            }
        }

        Query query = method.getAnnotation(Query.class);
        if (query != null) {
            String queryText = query.value().toLowerCase();
            if (queryText.contains("tenant_id") || queryText.contains("tenantid") || queryText.contains(":tenantid")) {
                return true;
            }
        }

        return false;
    }

    private String signatureOf(Method method) {
        return method.getName()
            + "("
            + Arrays.stream(method.getParameterTypes())
            .map(Class::getName)
            .collect(Collectors.joining(","))
            + ")";
    }

    private Class<?> loadClass(String className) {
        try {
            return Class.forName(className);
        } catch (ClassNotFoundException e) {
            throw new IllegalStateException("Impossibile caricare classe repository: " + className, e);
        }
    }
}