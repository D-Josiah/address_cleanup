import React, { useState, useEffect } from 'react';
import Papa from 'papaparse';


const AddressTable = () => {
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  // Function to properly capitalize words
  function toProperCase(str) {
    if (!str) return '';
    
    const lowercaseWords = ['of', 'the', 'in', 'on', 'at', 'by', 'and', 'or', 'a', 'an'];
    const specialCases = {
      'nsw': 'NSW', 'vic': 'VIC', 'qld': 'QLD', 'sa': 'SA', 'wa': 'WA',
      'tas': 'TAS', 'nt': 'NT', 'act': 'ACT', 'st': 'St', 'rd': 'Rd',
      'dr': 'Dr', 'ave': 'Ave', 'cres': 'Cres', 'cr': 'Cr', 'ct': 'Ct',
      'pl': 'Pl', 'ln': 'Ln', 'hwy': 'Hwy', 'mt': 'Mt'
    };
    
    return str.toLowerCase().split(' ').map((word, index) => {
      const lowerWord = word.toLowerCase();
      if (specialCases[lowerWord]) return specialCases[lowerWord];
      if (index > 0 && lowercaseWords.includes(lowerWord)) return lowerWord;
      
      if (word.includes('-')) {
        return word.split('-').map(part => 
          part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
        ).join('-');
      }
      
      if (word.includes("'")) {
        return word.split("'").map(part => 
          part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
        ).join("'");
      }
      
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    }).join(' ');
  }

  // Function to parse Australian addresses
  function parseAustralianAddress(addressStr) {
    if (!addressStr || typeof addressStr !== 'string') {
      return { 
        streetAddress: '', 
        city: '', 
        state: '', 
        postcode: '',
        issues: 'Empty or invalid address'
      };
    }
    
    const cleanAddress = addressStr.replace(/^["']|["']$/g, '').trim();
    if (!cleanAddress) {
      return { 
        streetAddress: '', 
        city: '', 
        state: '', 
        postcode: '',
        issues: 'Empty address' 
      };
    }
    
    let processedAddress = cleanAddress;
    if (cleanAddress.includes('\n')) {
      processedAddress = cleanAddress.split('\n')[0].trim();
    }
    
    const statePatterns = [
      { code: 'NSW', pattern: /\bNSW\b/i },
      { code: 'VIC', pattern: /\bVIC\b/i },
      { code: 'QLD', pattern: /\bQLD\b/i },
      { code: 'SA', pattern: /\bSA\b/i },
      { code: 'WA', pattern: /\bWA\b/i },
      { code: 'TAS', pattern: /\bTAS\b/i },
      { code: 'NT', pattern: /\bNT\b/i },
      { code: 'ACT', pattern: /\bACT\b/i }
    ];
    
    const postcodeRegex = /\b\d{4}\b/;
    const parts = processedAddress.split(',').map(part => part.trim());
    let streetAddress = '';
    let city = '';
    let state = '';
    let postcode = '';
    let issues = [];
    
    // Extract state
    let stateIndex = -1;
    for (let i = 0; i < parts.length; i++) {
      for (const { code, pattern } of statePatterns) {
        if (pattern.test(parts[i])) {
          state = code;
          stateIndex = i;
          break;
        }
      }
      if (state) break;
    }
    
    if (!state) issues.push('Missing state');
    
    // Extract postcode
    let postcodeIndex = -1;
    for (let i = 0; i < parts.length; i++) {
      const postcodeMatch = parts[i].match(postcodeRegex);
      if (postcodeMatch) {
        postcode = postcodeMatch[0];
        postcodeIndex = i;
        break;
      }
    }
    
    if (!postcode) issues.push('Missing postcode');
    
    // Extract city
    if (stateIndex > 0) {
      city = parts[stateIndex - 1];
    }
    
    if (!city) issues.push('Missing city');
    
    // Extract street address
    if (stateIndex > 1) {
      streetAddress = parts.slice(0, stateIndex - 1).join(', ');
    } else if (parts.length > 0) {
      streetAddress = parts[0];
    }
    
    if (!streetAddress) issues.push('Missing street address');
    
    // Cleanup
    if (city) {
      for (const { code } of statePatterns) {
        city = city.replace(new RegExp(`\\b${code}\\b`, 'gi'), '').trim();
      }
    }
    
    if (city && postcode) {
      city = city.replace(new RegExp(`\\b${postcode}\\b`), '').trim();
    }
    
    const tbaParts = ['tba', 'tbc', 'to be advised', 'to be confirmed'];
    
    if (streetAddress && tbaParts.some(part => streetAddress.toLowerCase().includes(part))) {
      streetAddress = toProperCase(streetAddress);
      issues.push('Street address contains TBA/TBC');
    } else {
      streetAddress = toProperCase(streetAddress);
    }
    
    if (city && tbaParts.some(part => city.toLowerCase().includes(part))) {
      city = toProperCase(city);
      issues.push('City contains TBA/TBC');
    } else {
      city = toProperCase(city);
    }
    
    if (state && tbaParts.some(part => state.toLowerCase().includes(part))) {
      issues.push('State contains TBA/TBC');
    }
    
    if (postcode && tbaParts.some(part => postcode.toLowerCase().includes(part))) {
      issues.push('Postcode contains TBA/TBC');
    }
    
    return {
      streetAddress,
      city,
      state,
      postcode,
      issues: issues.length > 0 ? issues.join('; ') : ''
    };
  }

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch('/australian-addresses.csv');
        const csvData = await response.text();
        
        Papa.parse(csvData, {
          header: false,
          skipEmptyLines: false,
          complete: (results) => {
            const processedAddresses = results.data.map((row, index) => {
              const rawValue = row[0] || '';
              
              if (index === 0 || rawValue.trim() === '') {
                return {
                  original: rawValue,
                  streetAddress: '',
                  city: '',
                  state: '',
                  postcode: '',
                  issues: index === 0 ? '' : 'Empty row',
                  isEmpty: index !== 0 && rawValue.trim() === ''
                };
              } else {
                const parsed = parseAustralianAddress(rawValue);
                return {
                  original: rawValue,
                  ...parsed,
                  isEmpty: false
                };
              }
            });
            
            setAddresses(processedAddresses);
            setLoading(false);
          },
          error: (error) => {
            setError(`CSV parsing error: ${error.message}`);
            setLoading(false);
          }
        });
      } catch (error) {
        setError(`Error loading data: ${error.message}`);
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Stats calculations
  const stats = React.useMemo(() => {
    if (!addresses.length) return null;
    
    const stateCount = {};
    addresses.forEach(addr => {
      if (addr.state && !addr.isEmpty) {
        stateCount[addr.state] = (stateCount[addr.state] || 0) + 1;
      }
    });
    
    return {
      total: addresses.filter(addr => !addr.isEmpty).length,
      stateDistribution: stateCount
    };
  }, [addresses]);

  // Table rows - all non-empty rows
  const tableAddresses = addresses.filter(addr => !addr.isEmpty);

  // Pagination
  const pageCount = Math.ceil(tableAddresses.length / itemsPerPage);
  const paginatedAddresses = tableAddresses.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Create CSV content for download
  const generateCsvContent = () => {
    const csvHeader = ['Street Address', 'City', 'State', 'Postcode', 'Issues'].join(',');
    const csvRows = addresses.map(addr => {
      if (addr.isEmpty) return '';
      
      const values = [
        `"${addr.streetAddress.replace(/"/g, '""')}"`,
        `"${addr.city.replace(/"/g, '""')}"`,
        `"${addr.state.replace(/"/g, '""')}"`,
        `"${addr.postcode.replace(/"/g, '""')}"`,
        `"${addr.issues.replace(/"/g, '""')}"`
      ];
      return values.join(',');
    });
    return [csvHeader, ...csvRows].join('\n');
  };

  // Function to trigger CSV download
  const downloadCsv = () => {
    const csvContent = generateCsvContent();
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'australian_addresses_parsed.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return <div className="loading-state">Loading address data...</div>;
  }

  if (error) {
    return <div className="error-state">Error: {error}</div>;
  }

  return (
    <div className="address-table-container">
      <h1>Australian Address Parser</h1>
      
      <div className="controls">
        <div className="file-upload">
          <label>Or upload your own CSV:</label>
          <input 
            type="file" 
            accept=".csv"
            onChange={(e) => {
              const file = e.target.files[0];
              if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                  Papa.parse(event.target.result, {
                    header: false,
                    skipEmptyLines: false,
                    complete: (results) => {
                      const processed = results.data.map((row, index) => {
                        const rawValue = row[0] || '';
                        if (index === 0 || rawValue.trim() === '') {
                          return {
                            original: rawValue,
                            streetAddress: '',
                            city: '',
                            state: '',
                            postcode: '',
                            issues: index === 0 ? '' : 'Empty row',
                            isEmpty: index !== 0 && rawValue.trim() === ''
                          };
                        } else {
                          const parsed = parseAustralianAddress(rawValue);
                          return {
                            original: rawValue,
                            ...parsed,
                            isEmpty: false
                          };
                        }
                      });
                      setAddresses(processed);
                    }
                  });
                };
                reader.readAsText(file);
              }
            }}
          />
        </div>
        
        <button 
          onClick={downloadCsv}
          className="download-btn"
          disabled={addresses.length === 0}
        >
          Download CSV
        </button>
      </div>
      
      <div className="table-wrapper">
        <table className="address-table">
          <thead>
            <tr>
              <th>Street Address</th>
              <th>City</th>
              <th>State</th>
              <th>Postcode</th>
              <th>Issues</th>
            </tr>
          </thead>
          <tbody>
            {paginatedAddresses.map((addr, idx) => (
              <tr key={idx}>
                <td>{addr.streetAddress}</td>
                <td>{addr.city}</td>
                <td>{addr.state}</td>
                <td>{addr.postcode}</td>
                <td className={addr.issues ? 'error-cell' : ''}>{addr.issues}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {pageCount > 1 && (
        <div className="pagination">
          <div className="page-info">
            Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, tableAddresses.length)} of {tableAddresses.length} addresses
          </div>
          <div className="page-controls">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(currentPage - 1)}
            >
              Previous
            </button>
            <span className="page-count">
              Page {currentPage} of {pageCount}
            </span>
            <button
              disabled={currentPage === pageCount}
              onClick={() => setCurrentPage(currentPage + 1)}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddressTable;