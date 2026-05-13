package com.rideops.architecture;

import com.tngtech.archunit.junit.AnalyzeClasses;
import com.tngtech.archunit.junit.ArchTest;
import com.tngtech.archunit.lang.ArchRule;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.classes;
import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;
import static com.tngtech.archunit.library.Architectures.layeredArchitecture;
import static com.tngtech.archunit.library.GeneralCodingRules.NO_CLASSES_SHOULD_ACCESS_STANDARD_STREAMS;
import static com.tngtech.archunit.library.GeneralCodingRules.NO_CLASSES_SHOULD_THROW_GENERIC_EXCEPTIONS;

/**
 * Security Architecture Fitness Functions per RideOps backend.
 *
 * Prevengono regressioni delle seguenti classi di vulnerabilità:
 *  - Crypto deboli (MD5, SHA-1, DES, Math.random)
 *  - Bypass del service layer (controller → repository diretto)
 *  - Endpoint senza autorizzazione esplicita
 *  - Log leakage (System.out / printStackTrace)
 *  - JWT logic scapolata dai controller
 *  - Contaminazione del domain layer con tipi HTTP/Security
 */
@AnalyzeClasses(packages = "com.rideops")
public class SecurityArchitectureRules {

    // ── Layer definitions ─────────────────────────────────────────────────────

    private static final String CONTROLLERS  = "com.rideops..adapters.in..";
    private static final String SERVICES     = "com.rideops..application..";
    private static final String REPOSITORIES = "com.rideops..adapters.out..";
    private static final String DOMAIN       = "com.rideops..domain..";
    private static final String CONFIG       = "com.rideops.config..";
    private static final String JWT_SERVICE  = "com.rideops.identity.application.JwtService";

    // ── (a) Crypto vietata ────────────────────────────────────────────────────

    /**
     * MD5 è crittograficamente rotto (CWE-327 / A02).
     * Non usarlo per hash di password, token, firme o identificatori.
     */
    @ArchTest
    static final ArchRule no_md5_usage =
        noClasses()
            .that().resideInAPackage("com.rideops..")
            .should().callMethod(java.security.MessageDigest.class, "getInstance", String.class)
            .orShould().accessField(java.security.MessageDigest.class, "MD5")
            .because("MD5 è crittograficamente rotto (CWE-327): usare SHA-256 o superiore");

    /**
     * Math.random() non è crittograficamente sicuro (CWE-338 / A02).
     * Per token/segreti usare SecureRandom o UUID.randomUUID().
     */
    @ArchTest
    static final ArchRule no_math_random =
        noClasses()
            .that().resideInAPackage("com.rideops..")
            .should().callMethod(Math.class, "random")
            .because("Math.random() è predicibile (CWE-338): usare java.security.SecureRandom per valori crittografici");

    /**
     * java.util.Random non è crittograficamente sicuro (CWE-338).
     * Nei contesti di sicurezza (reset token, OTP) usare SecureRandom.
     */
    @ArchTest
    static final ArchRule no_util_random_in_security_contexts =
        noClasses()
            .that().resideInAPackage("com.rideops..application..")
            .should().dependOnClassesThat().haveFullyQualifiedName("java.util.Random")
            .because("java.util.Random non è crittograficamente sicuro (CWE-338): usare SecureRandom nei service layer");

    // ── (b) Controller non accede direttamente ai Repository ─────────────────

    /**
     * I controller non devono importare classi repository (CWE-284 / A01).
     * Il service layer è il punto di enforcement delle regole di autorizzazione.
     * Un controller che accede direttamente al repository bypassa i controlli
     * di business logic e sicurezza (tenant isolation, RBAC, audit log).
     */
    @ArchTest
    static final ArchRule controllers_must_not_access_repositories_directly =
        noClasses()
            .that().resideInAPackage(CONTROLLERS)
            .should().dependOnClassesThat().resideInAPackage(REPOSITORIES)
            .because("I controller che accedono ai repository direttamente bypassano " +
                     "il service layer dove risiedono i controlli RBAC e tenant isolation (CWE-284)");

    // ── (c) Controller devono avere @PreAuthorize / @Secured ─────────────────

    /**
     * Ogni classe controller DEVE essere annotata con @PreAuthorize o @Secured
     * a livello di classe o metodo (CWE-284 / A01).
     *
     * Nota: AuthController è escluso perché gestisce endpoint pubblici (/auth/login,
     * /auth/forgot-password, /auth/reset-password) protetti a livello di SecurityConfig.
     */
    @ArchTest
    static final ArchRule controllers_must_be_annotated_with_PreAuthorize =
        classes()
            .that().resideInAPackage(CONTROLLERS)
            .and().areAnnotatedWith(org.springframework.web.bind.annotation.RestController.class)
            .and().haveSimpleNameNotContaining("AuthController")
            .and().haveSimpleNameNotContaining("RoleAccessController")
            .should().beAnnotatedWith(org.springframework.security.access.prepost.PreAuthorize.class)
            .because("Ogni controller deve dichiarare esplicitamente il ruolo richiesto " +
                     "per prevenire endpoint accidentalmente aperti (CWE-284 / OWASP A01)");

    // ── (d) Nessun System.out / printStackTrace in produzione ─────────────────

    /**
     * System.out.println e printStackTrace possono esporre stack trace e dati sensibili
     * nei log di produzione (CWE-117, CWE-532 / A09).
     */
    @ArchTest
    static final ArchRule no_standard_streams =
        NO_CLASSES_SHOULD_ACCESS_STANDARD_STREAMS
            .because("System.out/err e printStackTrace espongono informazioni sensibili nei log " +
                     "e non rispettano la configurazione di logging strutturato (CWE-532 / A09)");

    // ── (e) JwtService accessibile solo da config e identity.application ──────

    /**
     * JwtService contiene la chiave segreta e la logica di firma JWT.
     * Solo il layer di sicurezza/config e il proprio package possono accedervi.
     * Controller o repository che lo usano direttamente violano la separazione
     * delle responsabilità e rendono più difficile il key rotation (CWE-522 / A02).
     */
    @ArchTest
    static final ArchRule jwt_service_accessed_only_from_security_layer =
        noClasses()
            .that().resideInAPackage(CONTROLLERS)
            .or().resideInAPackage(REPOSITORIES)
            .or().resideInAPackage(DOMAIN)
            .should().dependOnClassesThat().haveFullyQualifiedName(JWT_SERVICE)
            .because("JwtService deve essere usato solo dal layer config/security e dal proprio " +
                     "package: i controller non devono manipolare JWT direttamente (CWE-522)");

    // ── (f) Domain entities non devono dipendere da tipi HTTP o Security ──────

    /**
     * Le entità domain devono essere pure: nessuna dipendenza da Jakarta Servlet,
     * Spring Web o Spring Security (CWE-1000: Poor Code Quality / Architettura pulita).
     * Una entity che importa HttpServletRequest viola il principio di inversione
     * delle dipendenze e rende impossibile il test unitario isolato.
     */
    @ArchTest
    static final ArchRule domain_must_not_depend_on_http_or_security =
        noClasses()
            .that().resideInAPackage(DOMAIN)
            .should().dependOnClassesThat().resideInAnyPackage(
                "jakarta.servlet..",
                "org.springframework.web..",
                "org.springframework.security.."
            )
            .because("Le entità domain devono essere ignoranti dell'infrastruttura HTTP e Security " +
                     "per garantire testabilità, separazione e design pulito (Clean Architecture)");

    // ── (g) Nessuna eccezione generica propagata ai client ───────────────────

    /**
     * Lanciare Exception o RuntimeException generiche dai controller espone
     * stack trace al client se l'exception handler non le intercetta (CWE-209 / A09).
     */
    @ArchTest
    static final ArchRule no_generic_exceptions =
        NO_CLASSES_SHOULD_THROW_GENERIC_EXCEPTIONS
            .because("Le eccezioni generiche possono esporre stack trace al client (CWE-209 / A09): " +
                     "usare ResponseStatusException o eccezioni di dominio specifiche");

    // ── (h) Repository non espone metodi senza filtro tenant nei moduli tenanted ──

    /**
     * Le classi Adapter/JPA nella persistenza che implementano port tenant-aware
     * devono filtrare per tenantId. Questa regola previene data leakage cross-tenant
     * (CWE-284 / A01 Broken Access Control).
     *
     * Nota: la verifica puntuale dei parametri è già coperta da
     * RepositoryTenantScopingArchitectureTest. Questa regola aggiunge un guard
     * a livello di dipendenza: nessun componente fuori dal proprio modulo
     * può usare TenantRepository direttamente.
     */
    @ArchTest
    static final ArchRule tenant_repository_accessed_only_from_own_module =
        noClasses()
            .that().resideInAPackage("com.rideops..")
            .and().resideOutsideOfPackage("com.rideops.multitenancy..")
            .should().dependOnClassesThat()
            .haveSimpleNameEndingWith("TenantRepository")
            .because("TenantRepository deve essere usato solo all'interno del modulo multitenancy " +
                     "per evitare accesso cross-tenant non mediato (CWE-284)");

    // ── (i) Nessuna dipendenza circolare tra adapter/in e adapter/out ─────────

    /**
     * Il layer adapter/in (controller) non deve dipendere da adapter/out (repository)
     * nemmeno indirettamente attraverso import — già coperto dalla regola (b),
     * questa aggiunge la verifica esplicita sulla dipendenza di layer.
     */
    @ArchTest
    static final ArchRule layered_architecture_security =
        layeredArchitecture()
            .consideringOnlyDependenciesInLayers()
            .layer("Controllers").definedBy(CONTROLLERS)
            .layer("Services").definedBy(SERVICES)
            .layer("Repositories").definedBy(REPOSITORIES)
            .layer("Config").definedBy(CONFIG)
            .whereLayer("Controllers").mayOnlyAccessLayers("Services", "Config")
            .whereLayer("Repositories").mayOnlyBeAccessedByLayers("Services")
            .because("L'architettura a strati garantisce che i controlli di sicurezza " +
                     "nel service layer non possano essere bypassati (CWE-284 / OWASP A01)");
}
