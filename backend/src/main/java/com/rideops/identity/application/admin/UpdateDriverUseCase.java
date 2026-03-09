package com.rideops.identity.application.admin;

import com.rideops.identity.domain.UserRole;
import java.time.LocalDate;
import java.util.List;
import java.util.Objects;
import org.springframework.stereotype.Service;

@Service
public class UpdateDriverUseCase {

    private final UserAdminRepositoryPort userAdminRepositoryPort;
    private final CreateUserUseCase createUserUseCase;

    public UpdateDriverUseCase(UserAdminRepositoryPort userAdminRepositoryPort,
                               CreateUserUseCase createUserUseCase) {
        this.userAdminRepositoryPort = userAdminRepositoryPort;
        this.createUserUseCase = createUserUseCase;
    }

    public UserSummaryDto execute(Long driverId,
                                  String firstName,
                                  String lastName,
                                  LocalDate birthDate,
                                  String licenseNumber,
                                  List<String> licenseTypes,
                                  List<String> residentialAddresses,
                                  String mobilePhone,
                                  LocalDate licenseExpiryDate) {
        Long safeDriverId = Objects.requireNonNull(driverId, "driverId is required");
        var driver = userAdminRepositoryPort.findById(safeDriverId)
            .orElseThrow(() -> new UserAdminNotFoundException("Driver not found"));

        if (driver.getRole() != UserRole.DRIVER) {
            throw new UserAdminValidationException("User is not a driver");
        }

        var profile = createUserUseCase.validateAndBuildDriverProfile(
            firstName,
            lastName,
            birthDate,
            licenseNumber,
            licenseTypes,
            residentialAddresses,
            mobilePhone,
            licenseExpiryDate
        );

        driver.setFirstName(profile.firstName());
        driver.setLastName(profile.lastName());
        driver.setBirthDate(profile.birthDate());
        driver.setLicenseNumber(profile.licenseNumber());
        driver.setLicenseTypesJson(DriverProfileJson.writeStringList(profile.licenseTypes()));
        driver.setResidentialAddressesJson(DriverProfileJson.writeStringList(profile.residentialAddresses()));
        driver.setMobilePhone(profile.mobilePhone());
        driver.setLicenseExpiryDate(profile.licenseExpiryDate());

        return UserAdminMapper.toDto(userAdminRepositoryPort.save(driver));
    }
}
