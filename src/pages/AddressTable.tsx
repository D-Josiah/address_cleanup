import React, { useState } from 'react';
import Papa from 'papaparse';

interface AddressData {
  original: string;
  validated: boolean;
  address_line1: string;
  address_line2: string;
  city: string;
  state_province: string;
  postal_code: string;
  country: string;
  country_code: string;
  formattedAddress: string;
  missingComponents: string[];
}

const AddressTable: React.FC = () => {
  const [addresses, setAddresses] = useState<string[]>([]);
  const [parsedAddresses, setParsedAddresses] = useState<AddressData[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Inline styles
  const styles = {
    container: {
      padding: '24px',
      maxWidth: '1200px',
      margin: '0 auto',
      backgroundColor: 'white',
      borderRadius: '8px',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
    },
    title: {
      fontSize: '24px',
      fontWeight: 'bold',
      marginBottom: '24px',
      color: '#1f2937',
      borderBottom: '1px solid #e5e7eb',
      paddingBottom: '10px'
    },
    infoBox: {
      marginBottom: '24px',
      padding: '16px',
      backgroundColor: '#f3f4f6',
      borderRadius: '6px'
    },
    infoContent: {
      display: 'flex',
      alignItems: 'center'
    },
    checkIcon: {
      color: '#10b981',
      marginRight: '12px'
    },
    infoTitle: {
      fontSize: '14px',
      fontWeight: '500',
      color: '#374151'
    },
    infoDesc: {
      fontSize: '12px',
      color: '#6b7280',
      marginTop: '4px'
    },
    uploadSection: {
      marginBottom: '24px'
    },
    label: {
      display: 'block',
      fontSize: '14px',
      fontWeight: '500',
      color: '#374151',
      marginBottom: '8px'
    },
    fileInput: {
      display: 'block',
      width: '100%',
      padding: '8px',
      border: '1px solid #d1d5db',
      borderRadius: '4px',
      fontSize: '14px',
      color: '#374151'
    },
    actionSection: {
      marginBottom: '24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between'
    },
    counter: {
      fontSize: '14px',
      color: '#4b5563'
    },
    processButton: {
      backgroundColor: '#10b981',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      padding: '8px 16px',
      fontSize: '14px',
      fontWeight: '500',
      cursor: 'pointer'
    },
    disabledButton: {
      backgroundColor: '#9ca3af',
      cursor: 'not-allowed'
    },
    errorMessage: {
      marginBottom: '24px',
      padding: '16px',
      backgroundColor: '#fee2e2',
      color: '#b91c1c',
      borderRadius: '6px'
    },
    resultsSection: {
      marginBottom: '24px'
    },
    resultsHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '16px'
    },
    resultsTitle: {
      fontSize: '18px',
      fontWeight: '600',
      color: '#1f2937'
    },
    downloadButtons: {
      display: 'flex',
      gap: '8px'
    },
    downloadFullButton: {
      backgroundColor: '#3b82f6',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      padding: '6px 12px',
      fontSize: '12px',
      cursor: 'pointer'
    },
    downloadCleanButton: {
      backgroundColor: '#10b981',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      padding: '6px 12px',
      fontSize: '12px',
      cursor: 'pointer'
    },
    tableContainer: {
      overflowX: 'auto'
    },
    resultsTable: {
      width: '100%',
      borderCollapse: 'collapse',
      fontSize: '14px'
    },
    tableHead: {
      backgroundColor: '#f3f4f6'
    },
    tableHeadCell: {
      padding: '12px',
      textAlign: 'left',
      fontSize: '12px',
      fontWeight: '600',
      color: '#6b7280',
      textTransform: 'uppercase',
      borderBottom: '1px solid #e5e7eb'
    },
    tableRow: (isEven: boolean) => ({
      backgroundColor: isEven ? 'white' : '#f9fafb'
    }),
    tableCell: {
      padding: '12px',
      borderBottom: '1px solid #e5e7eb'
    },
    statusValidated: {
      display: 'inline-block',
      padding: '4px 8px',
      backgroundColor: '#d1fae5',
      color: '#065f46',
      borderRadius: '9999px',
      fontSize: '12px',
      fontWeight: '600'
    },
    statusBasic: {
      display: 'inline-block',
      padding: '4px 8px',
      backgroundColor: '#fef3c7',
      color: '#92400e',
      borderRadius: '9999px',
      fontSize: '12px',
      fontWeight: '600'
    },
    missingComponents: {
      color: '#ef4444',
      fontSize: '12px'
    },
    noMissing: {
      color: '#10b981',
      fontSize: '12px'
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setIsLoading(true);
      setError(null);
      
      Papa.parse(file, {
        header: false,
        skipEmptyLines: true,
        complete: (results) => {
          // Extract the address strings from the parsed CSV
          const addressStrings = results.data.map((row: any) => row[0]).filter(Boolean);
          setAddresses(addressStrings);
          setIsLoading(false);
        },
        error: (error) => {
          setError(`Error parsing CSV: ${error.message}`);
          setIsLoading(false);
        }
      });
    }
  };

  const parseAddressBasic = (addressString: string): AddressData => {
    // Basic parsing without API
    const parts = addressString.split(',').map(part => part.trim());
    
    let address_line1 = '';
    let address_line2 = '';
    let city = '';
    let state_province = '';
    let postal_code = '';
    let country = '';
    let country_code = '';
    let missingComponents: string[] = [];
    
    // Very basic parsing logic - can be improved
    if (parts.length >= 1) {
      address_line1 = parts[0];
    } else {
      missingComponents.push('address_line1');
    }
    
    if (parts.length >= 2) {
      // Try to detect if this part looks like an address line 2 (apt, unit, etc.)
      const secondPart = parts[1].toLowerCase();
      if (secondPart.includes('apt') || 
          secondPart.includes('unit') || 
          secondPart.includes('#') || 
          secondPart.includes('suite') || 
          secondPart.includes('floor')) {
        address_line2 = parts[1];
        
        // Shift other parts if we identified address_line2
        if (parts.length >= 3) {
          city = parts[2];
        } else {
          missingComponents.push('city');
        }
      } else {
        // Otherwise assume it's the city
        city = parts[1];
      }
    } else {
      missingComponents.push('city');
    }
    
    // Adjust part indexes based on whether we found address_line2
    const statePartIndex = address_line2 ? 3 : 2;
    const countryPartIndex = address_line2 ? 4 : 3;
    
    if (parts.length >= statePartIndex) {
      // Try to extract state and postal code
      const statePostalParts = parts[statePartIndex].split(' ').filter(Boolean);
      
      if (statePostalParts.length >= 2) {
        const lastPart = statePostalParts[statePostalParts.length - 1];
        
        if (/^\d+$/.test(lastPart) || /^[A-Z]\d[A-Z]\s?\d[A-Z]\d$/i.test(lastPart)) { // Match US or Canada postal codes
          postal_code = lastPart;
          state_province = statePostalParts.slice(0, -1).join(' ');
        } else {
          state_province = parts[statePartIndex];
          missingComponents.push('postal_code');
        }
      } else {
        state_province = parts[statePartIndex];
        missingComponents.push('postal_code');
      }
    } else {
      missingComponents.push('state_province');
      missingComponents.push('postal_code');
    }
    
    if (parts.length >= countryPartIndex) {
      country = parts[countryPartIndex];
      
      // Try to determine country code based on country name using a more extensive mapping
      const countryMap: { [key: string]: string } = {
        'united states': 'US', 'usa': 'US', 'us': 'US', 'united states of america': 'US',
        'canada': 'CA', 'australia': 'AU', 'united kingdom': 'GB', 'uk': 'GB', 'great britain': 'GB',
        'england': 'GB', 'scotland': 'GB', 'wales': 'GB', 'northern ireland': 'GB',
        'ireland': 'IE', 'france': 'FR', 'germany': 'DE', 'italy': 'IT', 'spain': 'ES',
        'japan': 'JP', 'china': 'CN', 'india': 'IN', 'brazil': 'BR', 'mexico': 'MX',
        'russia': 'RU', 'south africa': 'ZA', 'new zealand': 'NZ', 'netherlands': 'NL',
        'belgium': 'BE', 'sweden': 'SE', 'norway': 'NO', 'denmark': 'DK', 'finland': 'FI',
        'poland': 'PL', 'austria': 'AT', 'switzerland': 'CH', 'portugal': 'PT',
        'greece': 'GR', 'turkey': 'TR', 'israel': 'IL', 'saudi arabia': 'SA',
        'united arab emirates': 'AE', 'uae': 'AE', 'singapore': 'SG',
        'malaysia': 'MY', 'thailand': 'TH', 'vietnam': 'VN', 'south korea': 'KR',
        'korea': 'KR', 'indonesia': 'ID', 'philippines': 'PH', 'argentina': 'AR',
        'chile': 'CL', 'colombia': 'CO', 'peru': 'PE', 'venezuela': 'VE',
        'nigeria': 'NG', 'egypt': 'EG', 'kenya': 'KE', 'ghana': 'GH',
        'pakistan': 'PK', 'bangladesh': 'BD', 'sri lanka': 'LK', 'nepal': 'NP'
      };
      
   
      country_code = country && countryMap[country.toLowerCase()] || '';
      if (!country_code) {
        missingComponents.push('country_code');
      }
    } else {
      missingComponents.push('country');
      missingComponents.push('country_code');
    }
    
    // Try to detect if it's a US state and set country if missing
    if (state_province && !country) {
      const usStates = ['AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 
                      'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 
                      'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 
                      'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 
                      'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
                      'DC', 'AS', 'GU', 'MP', 'PR', 'VI'];
      
      const stateUpper = state_province.toUpperCase();
      if (usStates.includes(stateUpper) || 
          usStates.some(abbr => state_province.toUpperCase().endsWith(` ${abbr}`))) {
        country = 'United States';
        country_code = 'US';
        if (missingComponents.includes('country')) {
          missingComponents.splice(missingComponents.indexOf('country'), 1);
        }
        if (missingComponents.includes('country_code')) {
          missingComponents.splice(missingComponents.indexOf('country_code'), 1);
        }
      }
    }
    
    // Try to detect if it's a Canadian province and set country if missing
    if (state_province && !country) {
      const canadianProvinces = ['AB', 'BC', 'MB', 'NB', 'NL', 'NT', 'NS', 'NU', 'ON', 'PE', 'QC', 'SK', 'YT'];
      
      const stateUpper = state_province.toUpperCase();
      if (canadianProvinces.includes(stateUpper) || 
          canadianProvinces.some(abbr => state_province.toUpperCase().endsWith(` ${abbr}`))) {
        country = 'Canada';
        country_code = 'CA';
        if (missingComponents.includes('country')) {
          missingComponents.splice(missingComponents.indexOf('country'), 1);
        }
        if (missingComponents.includes('country_code')) {
          missingComponents.splice(missingComponents.indexOf('country_code'), 1);
        }
      }
    }
    
    // Try to infer postal code format if we have country but no postal code
    if (country_code && !postal_code) {
      // Look for postal code patterns in the original string based on country
      const originalUpper = addressString.toUpperCase();
      
      if (country_code === 'US') {
        // US ZIP code: 5 digits or ZIP+4
        const zipMatch = originalUpper.match(/\b\d{5}(?:-\d{4})?\b/);
        if (zipMatch) {
          postal_code = zipMatch[0];
          if (missingComponents.includes('postal_code')) {
            missingComponents.splice(missingComponents.indexOf('postal_code'), 1);
          }
        }
      } else if (country_code === 'CA') {
        // Canadian postal code: A1A 1A1
        const postalMatch = originalUpper.match(/\b[A-Z]\d[A-Z]\s?\d[A-Z]\d\b/);
        if (postalMatch) {
          postal_code = postalMatch[0];
          if (missingComponents.includes('postal_code')) {
            missingComponents.splice(missingComponents.indexOf('postal_code'), 1);
          }
        }
      } else if (country_code === 'GB') {
        // UK postcode
        const postCodeMatch = originalUpper.match(/\b[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}\b/);
        if (postCodeMatch) {
          postal_code = postCodeMatch[0];
          if (missingComponents.includes('postal_code')) {
            missingComponents.splice(missingComponents.indexOf('postal_code'), 1);
          }
        }
      }
    }
    
    return {
      original: addressString,
      validated: false,
      address_line1,
      address_line2,
      city,
      state_province,
      postal_code,
      country,
      country_code,
      formattedAddress: [
        address_line1,
        address_line2,
        city,
        state_province + (postal_code ? ` ${postal_code}` : ''),
        country
      ].filter(Boolean).join(', '),
      missingComponents
    };
  };

  const validateAddress = async (addressString: string): Promise<AddressData> => {
    try {
      // Encode the address string for URL
      const encodedAddress = encodeURIComponent(addressString);
      
      // Call the proxy server for Places Autocomplete API
      const response = await fetch(
        `http://localhost:5000/api/autocomplete?input=${encodedAddress}`,
        { method: 'GET' }
      );
      
      if (!response.ok) {
        throw new Error(`Proxy API returned ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.status === 'OK' && data.predictions && data.predictions.length > 0) {
        // Get the place ID of the first prediction
        const placeId = data.predictions[0].place_id;
        
        // Use the Place Details API via proxy to get the complete address details
        const detailsResponse = await fetch(
          `http://localhost:5000/api/details?place_id=${placeId}&fields=address_component,formatted_address`,
          { method: 'GET' }
        );
        
        if (!detailsResponse.ok) {
          throw new Error(`Details API returned ${detailsResponse.status}`);
        }
        
        const detailsData = await detailsResponse.json();
        
        if (detailsData.status === 'OK' && detailsData.result) {
          const addressComponents = detailsData.result.address_components || [];
          const formattedAddress = detailsData.result.formatted_address || '';
          
          // Extract all possible address components
          const streetNumber = addressComponents.find((comp: any) => comp.types.includes('street_number'))?.long_name || '';
          const route = addressComponents.find((comp: any) => comp.types.includes('route'))?.long_name || '';
          const subpremise = addressComponents.find((comp: any) => comp.types.includes('subpremise'))?.long_name || '';
          const premise = addressComponents.find((comp: any) => comp.types.includes('premise'))?.long_name || '';
          const floor = addressComponents.find((comp: any) => comp.types.includes('floor'))?.long_name || '';
          const room = addressComponents.find((comp: any) => comp.types.includes('room'))?.long_name || '';
          
          // Find city: try multiple possible components as different countries use different designations
          const city = 
            addressComponents.find((comp: any) => comp.types.includes('locality'))?.long_name || 
            addressComponents.find((comp: any) => comp.types.includes('postal_town'))?.long_name || 
            addressComponents.find((comp: any) => comp.types.includes('administrative_area_level_3'))?.long_name || 
            addressComponents.find((comp: any) => comp.types.includes('administrative_area_level_2'))?.long_name || '';
          
          // State/province
          const state = 
            addressComponents.find((comp: any) => comp.types.includes('administrative_area_level_1'))?.long_name || '';
          const stateShort = 
            addressComponents.find((comp: any) => comp.types.includes('administrative_area_level_1'))?.short_name || '';
            
          // Postal code details
          const postalCode = addressComponents.find((comp: any) => comp.types.includes('postal_code'))?.long_name || '';
          const postalCodePrefix = addressComponents.find((comp: any) => comp.types.includes('postal_code_prefix'))?.long_name || '';
          
          // Country details  
          const country = addressComponents.find((comp: any) => comp.types.includes('country'))?.long_name || '';
          const countryCode = addressComponents.find((comp: any) => comp.types.includes('country'))?.short_name || '';
          
          // Compose address line 1 and 2 with more complete information
          let address_line1 = '';
          let address_line2 = '';
          
          // Address line 1: Typically street number + route (street name)
          if (streetNumber && route) {
            address_line1 = `${streetNumber} ${route}`;
          } else if (route) {
            address_line1 = route;
          } else if (premise) {
            address_line1 = premise;
          } else {
            // If we don't have typical street components, extract from formatted address
            const formattedParts = formattedAddress.split(',');
            if (formattedParts.length > 0) {
              address_line1 = formattedParts[0].trim();
            }
          }
          
          // Address line 2: Build from subpremise, floor, room, etc.
          const line2Parts = [];
          if (subpremise) line2Parts.push(`Unit ${subpremise}`);
          if (floor) line2Parts.push(`Floor ${floor}`);
          if (room) line2Parts.push(`Room ${room}`);
          
          address_line2 = line2Parts.join(', ');
          
          // Create the formatted address if not provided by the API
          const customFormattedAddress = formattedAddress || [
            address_line1,
            address_line2,
            city,
            state,
            postalCode,
            country
          ].filter(Boolean).join(', ');
          
          // Check for missing components
          const missingComponents: string[] = [];
          if (!address_line1) missingComponents.push('address_line1');
          if (!city) missingComponents.push('city');
          if (!state) missingComponents.push('state_province');
          if (!postalCode) missingComponents.push('postal_code');
          if (!country) missingComponents.push('country');
          if (!countryCode) missingComponents.push('country_code');
          
          return {
            original: addressString,
            validated: true,
            address_line1,
            address_line2,
            city,
            state_province: state || stateShort,
            postal_code: postalCode || postalCodePrefix,
            country,
            country_code: countryCode,
            formattedAddress: customFormattedAddress,
            missingComponents
          };
        }
      }
      
      // If no valid result found, try another approach with geocoding API for better results
      try {
        // Direct geocoding API call via proxy as a backup
        const geocodeResponse = await fetch(
          `http://localhost:5000/api/geocode?address=${encodedAddress}`,
          { method: 'GET' }
        );
        
        if (geocodeResponse.ok) {
          const geocodeData = await geocodeResponse.json();
          
          if (geocodeData.status === 'OK' && geocodeData.results && geocodeData.results.length > 0) {
            const result = geocodeData.results[0];
            const addressComponents = result.address_components || [];
            const formattedAddress = result.formatted_address || '';
            
            // Extract components using the same logic as above
            const streetNumber = addressComponents.find((comp: any) => comp.types.includes('street_number'))?.long_name || '';
            const route = addressComponents.find((comp: any) => comp.types.includes('route'))?.long_name || '';
            const subpremise = addressComponents.find((comp: any) => comp.types.includes('subpremise'))?.long_name || '';
            
            const city = 
              addressComponents.find((comp: any) => comp.types.includes('locality'))?.long_name || 
              addressComponents.find((comp: any) => comp.types.includes('postal_town'))?.long_name || 
              addressComponents.find((comp: any) => comp.types.includes('administrative_area_level_3'))?.long_name || 
              addressComponents.find((comp: any) => comp.types.includes('administrative_area_level_2'))?.long_name || '';
            
            const state = 
              addressComponents.find((comp: any) => comp.types.includes('administrative_area_level_1'))?.long_name || '';
            const stateShort = 
              addressComponents.find((comp: any) => comp.types.includes('administrative_area_level_1'))?.short_name || '';
              
            const postalCode = addressComponents.find((comp: any) => comp.types.includes('postal_code'))?.long_name || '';
            const country = addressComponents.find((comp: any) => comp.types.includes('country'))?.long_name || '';
            const countryCode = addressComponents.find((comp: any) => comp.types.includes('country'))?.short_name || '';
            
            let address_line1 = '';
            let address_line2 = '';
            
            if (streetNumber && route) {
              address_line1 = `${streetNumber} ${route}`;
            } else if (route) {
              address_line1 = route;
            } else {
              const formattedParts = formattedAddress.split(',');
              if (formattedParts.length > 0) {
                address_line1 = formattedParts[0].trim();
              }
            }
            
            address_line2 = subpremise ? `Unit ${subpremise}` : '';
            
            // Check for missing components
            const missingComponents: string[] = [];
            if (!address_line1) missingComponents.push('address_line1');
            if (!city) missingComponents.push('city');
            if (!state && !stateShort) missingComponents.push('state_province');
            if (!postalCode) missingComponents.push('postal_code');
            if (!country) missingComponents.push('country');
            if (!countryCode) missingComponents.push('country_code');
            
            return {
              original: addressString,
              validated: true,
              address_line1,
              address_line2,
              city,
              state_province: state || stateShort,
              postal_code: postalCode,
              country,
              country_code: countryCode,
              formattedAddress: formattedAddress,
              missingComponents
            };
          }
        }
      } catch (geocodeError) {
        console.error("Geocoding API error:", geocodeError);
        // Continue to fallback parsing if geocoding fails
      }
      
      // If all Google API methods fail, parse the address with basic logic
      return parseAddressBasic(addressString);
    } catch (error) {
      console.error("Address validation error:", error);
      // Fallback to basic parsing
      return parseAddressBasic(addressString);
    }
  };

  const validateAndParseAddresses = async () => {
    if (addresses.length === 0) {
      setError("Please upload a CSV file first");
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      // Process addresses in batches to avoid rate limits
      const batchSize = 10;
      const results: AddressData[] = [];
      
      for (let i = 0; i < addresses.length; i += batchSize) {
        const batch = addresses.slice(i, i + batchSize);
        const batchPromises = batch.map(address => validateAddress(address));
        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
        
        // Add a small delay between batches to respect API rate limits
        if (i + batchSize < addresses.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      setParsedAddresses(results);
    } catch (err: any) {
      setError(`Error validating addresses: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const exportToCSV = (type: 'full' | 'clean') => {
    if (parsedAddresses.length === 0) {
      setError("No addresses to export");
      return;
    }
    
    let headers: string[];
    let csvData: any[][];
    
    if (type === 'full') {
      // Export full data with all columns
      headers = [
        'Original Address',
        'Validated',
        'Address Line 1',
        'Address Line 2',
        'City',
        'State/Province', 
        'Postal Code',
        'Country',
        'Country Code',
        'Formatted Address',
        'Missing Components'
      ];
      
      csvData = [
        headers,
        ...parsedAddresses.map(addr => [
          addr.original,
          addr.validated.toString(),
          addr.address_line1,
          addr.address_line2,
          addr.city,
          addr.state_province,
          addr.postal_code,
          addr.country,
          addr.country_code,
          addr.formattedAddress,
          addr.missingComponents.join(', ')
        ])
      ];
    } else {
      // Export clean version with only essential columns
      headers = [
        'Address Line 1',
        'Address Line 2',
        'City',
        'State/Province', 
        'Postal Code',
        'Country',
        'Country Code'
      ];
      
      csvData = [
        headers,
        ...parsedAddresses.map(addr => [
          addr.address_line1,
          addr.address_line2,
          addr.city,
          addr.state_province,
          addr.postal_code,
          addr.country,
          addr.country_code
        ])
      ];
    }
    
    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
   
    // Create a link and trigger download
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', type === 'full' ? 'address_validation_full.csv' : 'address_clean.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Address Details Validation</h1>
      
      <div style={styles.infoBox}>
        <div style={styles.infoContent}>
          <div style={styles.checkIcon}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </div>
          <div>
            <p style={styles.infoTitle}>
              Google Places API is configured and ready to use
            </p>
            <p style={styles.infoDesc}>
              The component is using your developer API key for address validation
            </p>
          </div>
        </div>
      </div>
      
      <div style={styles.uploadSection}>
        <label style={styles.label}>
          Upload CSV with addresses (one address per row):
        </label>
        <input
          type="file"
          accept=".csv"
          onChange={handleFileUpload}
          style={styles.fileInput}
        />
      </div>
      
      {addresses.length > 0 && (
        <div style={styles.actionSection}>
          <p style={styles.counter}>
            {addresses.length} address{addresses.length !== 1 ? 'es' : ''} loaded
          </p>
          <button
            onClick={validateAndParseAddresses}
            disabled={isLoading}
            style={{
              ...styles.processButton,
              ...(isLoading ? styles.disabledButton : {})
            }}
          >
            {isLoading ? 'Processing...' : 'Validate & Parse Addresses'}
          </button>
        </div>
      )}
      
      {error && (
        <div style={styles.errorMessage}>
          {error}
        </div>
      )}
      
      {parsedAddresses.length > 0 && (
        <div style={styles.resultsSection}>
          <div style={styles.resultsHeader}>
            <h2 style={styles.resultsTitle}>Address Details</h2>
            <div style={styles.downloadButtons}>
              <button
                onClick={() => exportToCSV('full')}
                style={styles.downloadFullButton}
              >
                Download Full Report
              </button>
              <button
                onClick={() => exportToCSV('clean')}
                style={styles.downloadCleanButton}
              >
                Download Clean Addresses
              </button>
            </div>
          </div>
          
          <div style={styles.tableContainer}>
            <table style={styles.resultsTable}>
              <thead style={styles.tableHead}>
                <tr>
                  <th style={styles.tableHeadCell}>Original</th>
                  <th style={styles.tableHeadCell}>Status</th>
                  <th style={styles.tableHeadCell}>Address Line 1</th>
                  <th style={styles.tableHeadCell}>Address Line 2</th>
                  <th style={styles.tableHeadCell}>City</th>
                  <th style={styles.tableHeadCell}>State/Province</th>
                  <th style={styles.tableHeadCell}>Postal Code</th>
                  <th style={styles.tableHeadCell}>Country</th>
                  <th style={styles.tableHeadCell}>Country Code</th>
                  <th style={styles.tableHeadCell}>Missing</th>
                </tr>
              </thead>
              <tbody>
                {parsedAddresses.map((address, index) => (
                  <tr key={index} style={styles.tableRow(index % 2 === 0)}>
                    <td style={styles.tableCell}>{address.original}</td>
                    <td style={styles.tableCell}>
                      {address.validated ? (
                        <span style={styles.statusValidated}>
                          Validated
                        </span>
                      ) : (
                        <span style={styles.statusBasic}>
                          Basic Parse
                        </span>
                      )}
                    </td>
                    <td style={styles.tableCell}>{address.address_line1 || '—'}</td>
                    <td style={styles.tableCell}>{address.address_line2 || '—'}</td>
                    <td style={styles.tableCell}>{address.city || '—'}</td>
                    <td style={styles.tableCell}>{address.state_province || '—'}</td>
                    <td style={styles.tableCell}>{address.postal_code || '—'}</td>
                    <td style={styles.tableCell}>{address.country || '—'}</td>
                    <td style={styles.tableCell}>{address.country_code || '—'}</td>
                    <td style={styles.tableCell}>
                      {address.missingComponents.length > 0 ? (
                        <span style={styles.missingComponents}>
                          {address.missingComponents.join(', ')}
                        </span>
                      ) : (
                        <span style={styles.noMissing}>None</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddressTable;