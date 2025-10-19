'use client';

import React, { useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';

interface Country {
    code: string;
    name: string;
    flag: string;
}

const COUNTRIES: Country[] = [
    { code: 'RU', name: 'Россия', flag: '🇷🇺' },
    { code: 'UA', name: 'Украина', flag: '🇺🇦' },
    { code: 'BY', name: 'Беларусь', flag: '🇧🇾' },
    { code: 'KZ', name: 'Казахстан', flag: '🇰🇿' },
    { code: 'US', name: 'США', flag: '🇺🇸' },
    { code: 'CN', name: 'Китай', flag: '🇨🇳' },
    { code: 'JP', name: 'Япония', flag: '🇯🇵' },
    { code: 'DE', name: 'Германия', flag: '🇩🇪' }
];

interface CountrySelectorProps {
    selectedCountries: string[];
    onChange: (countries: string[]) => void;
}

const CountrySelector: React.FC<CountrySelectorProps> = ({
    selectedCountries,
    onChange
}) => {
    const [isOpen, setIsOpen] = useState(false);

    const handleToggleCountry = (countryCode: string) => {
        const newSelection = selectedCountries.includes(countryCode)
            ? selectedCountries.filter(code => code !== countryCode)
            : [...selectedCountries, countryCode];
        
        onChange(newSelection);
    };

    const getSelectedCountryNames = () => {
        if (selectedCountries.length === 0) return 'Выберите страны';
        if (selectedCountries.length === 1) {
            const country = COUNTRIES.find(c => c.code === selectedCountries[0]);
            return country ? `${country.flag} ${country.name}` : selectedCountries[0];
        }
        return `Выбрано: ${selectedCountries.length}`;
    };

    return (
        <div className="country-selector">
            <button
                type="button"
                className={`country-selector-trigger ${isOpen ? 'open' : ''}`}
                onClick={() => setIsOpen(!isOpen)}
            >
                <span className="country-selector-text">
                    {getSelectedCountryNames()}
                </span>
                <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="country-selector-dropdown">
                    {COUNTRIES.map((country) => {
                        const isSelected = selectedCountries.includes(country.code);
                        return (
                            <button
                                key={country.code}
                                type="button"
                                className={`country-option ${isSelected ? 'selected' : ''}`}
                                onClick={() => handleToggleCountry(country.code)}
                            >
                                <div className="country-info">
                                    <span className="country-flag">{country.flag}</span>
                                    <span className="country-name">{country.name}</span>
                                    <span className="country-code">({country.code})</span>
                                </div>
                                {isSelected && (
                                    <Check className="w-4 h-4 text-green-500" />
                                )}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default CountrySelector;
