import { Country } from "country-state-city";

export interface CountryOption {
  isoCode: string;
  name: string;
}

/** Sorted country list for address dropdowns. */
export const getCountryOptions = (): CountryOption[] =>
  Country.getAllCountries()
    .map((country) => ({ isoCode: country.isoCode, name: country.name }))
    .sort((a, b) => a.name.localeCompare(b.name));

export const STATE_NOT_APPLICABLE = "N/A";
export const ZIP_NOT_APPLICABLE = "N/A";
