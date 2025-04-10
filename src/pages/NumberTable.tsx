import React, { useState, ChangeEvent, useEffect } from 'react';
import * as Papa from 'papaparse';
import * as libphonenumber from 'libphonenumber-js';

// Define types
interface PhoneNumberValidationResult {
  originalNumber: string;
  cleanedNumber: string;
  formattedNumber?: string;
  nationalNumber?: number;
  countryCode?: string;
  country?: string;
  type?: string;
  issues: string[];
}

interface CsvRow {
  [key: string]: string;
}

interface Styles {
  [key: string]: React.CSSProperties;
}

const NumberTable: React.FC = () => {
  const [csvData, setCsvData] = useState<string[]>([]);
  const [rawCsvData, setRawCsvData] = useState<CsvRow[]>([]);
  const [csvColumns, setCsvColumns] = useState<string[]>([]);
  const [selectedColumn, setSelectedColumn] = useState<string>('');
  const [cleanedData, setCleanedData] = useState<PhoneNumberValidationResult[]>([]);
  const [invalidNumbers, setInvalidNumbers] = useState<PhoneNumberValidationResult[]>([]);
  const [fileUploaded, setFileUploaded] = useState<boolean>(false);

  // Styles object
  const styles: Styles = {
    container: {
      maxWidth: '950px',
      margin: '0 auto',
      padding: '30px',
      fontFamily: 'Inter, system-ui, sans-serif',
      backgroundColor: '#f8f9fa',
      borderRadius: '12px',
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
    },
    title: {
      fontSize: '28px',
      fontWeight: 'bold',
      color: '#2c3e50',
      marginBottom: '25px',
      textAlign: 'center',
      textTransform: 'uppercase',
      letterSpacing: '1px',
    },
    subtitle: {
      fontSize: '20px',
      fontWeight: '600',
      color: '#34495e',
      margin: '20px 0 15px',
      borderBottom: '2px solid #3498db',
      paddingBottom: '8px',
      display: 'inline-block',
    },
    fileInputContainer: {
      marginBottom: '30px',
      textAlign: 'center',
      backgroundColor: '#ffffff',
      padding: '25px',
      borderRadius: '8px',
      boxShadow: '0 2px 10px rgba(0, 0, 0, 0.05)',
    },
    fileInput: {
      width: '100%',
      maxWidth: '450px',
      padding: '14px',
      border: '2px dashed #3498db',
      borderRadius: '8px',
      backgroundColor: '#f0f7ff',
      color: '#2c3e50',
      transition: 'all 0.3s ease',
      cursor: 'pointer',
      fontSize: '16px',
    },
    resultsSummary: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '25px',
      backgroundColor: '#ffffff',
      padding: '20px',
      borderRadius: '8px',
      boxShadow: '0 2px 10px rgba(0, 0, 0, 0.05)',
    },
    downloadButton: {
      backgroundColor: '#3498db',
      color: 'white',
      border: 'none',
      padding: '12px 20px',
      borderRadius: '6px',
      cursor: 'pointer',
      transition: 'background-color 0.3s ease',
      fontWeight: 'bold',
      fontSize: '16px',
      boxShadow: '0 2px 5px rgba(52, 152, 219, 0.3)',
    },
    tableContainer: {
      width: '100%',
      overflowX: 'auto',
      backgroundColor: '#ffffff',
      padding: '20px',
      borderRadius: '8px',
      boxShadow: '0 2px 10px rgba(0, 0, 0, 0.05)',
      marginBottom: '30px',
    },
    table: {
      width: '100%',
      borderCollapse: 'separate',
      borderSpacing: '0',
      marginBottom: '20px',
      borderRadius: '8px',
      overflow: 'hidden',
    },
    tableHeader: {
      backgroundColor: '#3498db',
      color: 'white',
    },
    tableCell: {
      border: '1px solid #e0e0e0',
      padding: '12px 15px',
      textAlign: 'left',
      fontSize: '15px',
    },
    tableRowEven: {
      backgroundColor: '#f5f9ff',
    },
    invalidTable: {
      backgroundColor: '#ffecee',
    },
  };

  // Detailed phone number cleaning function
  const cleanPhoneNumber = (rawNumber: string): PhoneNumberValidationResult => {
    // Initial validation and cleaning
    const cleanNumber = (() => {
      // Convert to string and trim
      let cleaned = rawNumber.toString().trim();
      
      // Remove any labels or prefixes
      cleaned = cleaned.replace(/^(mobile:|ph:|phone:|mobile\s*:?\s*)/i, '');
      
      // Remove any non-digit characters except '+'
      cleaned = cleaned.replace(/[^\d+]/g, '');
      
      // Handle numbers with embedded text
      const numberMatch = cleaned.match(/\+?\d+/);
      return numberMatch ? numberMatch[0] : '';
    })();

    // Validation checks
    const validationResult: PhoneNumberValidationResult = {
      originalNumber: rawNumber,
      cleanedNumber: cleanNumber,
      issues: []
    };

    // Check for empty string
    if (!cleanNumber) {
      validationResult.issues.push('Empty or non-numeric input');
      return validationResult;
    }

    // Check length constraints
    if (cleanNumber.length < 6) {
      validationResult.issues.push('Number too short');
      return validationResult;
    }

    if (cleanNumber.length > 15) {
      validationResult.issues.push('Number too long');
      return validationResult;
    }

    try {
      // Try parsing with default country (Australia)
      const parsedNumber = libphonenumber.parsePhoneNumber(cleanNumber, 'AU');
      
      // Validate the number
      if (!parsedNumber.isValid()) {
        validationResult.issues.push('Invalid number format');
        return validationResult;
      }

      // Determine number type
      const type = getPhoneNumberType(parsedNumber);

      // Return fully parsed and validated number
      return {
        originalNumber: rawNumber,
        cleanedNumber: cleanNumber,
        formattedNumber: parsedNumber.formatInternational(),
        nationalNumber: parsedNumber.nationalNumber,
        countryCode: parsedNumber.countryCallingCode,
        country: parsedNumber.country,
        type: type,
        issues: []
      };
    } catch (error) {
      // If Australian parse fails, try international parse
      try {
        const internationalParse = libphonenumber.parsePhoneNumber(cleanNumber);
        
        if (internationalParse.isValid()) {
          return {
            originalNumber: rawNumber,
            cleanedNumber: cleanNumber,
            formattedNumber: internationalParse.formatInternational(),
            nationalNumber: internationalParse.nationalNumber,
            countryCode: internationalParse.countryCallingCode,
            country: internationalParse.country,
            type: getPhoneNumberType(internationalParse),
            issues: []
          };
        }
      } catch (intlError) {
        validationResult.issues.push('Parsing failed');
      }
      
      return validationResult;
    }
  };

  // Determine phone number type with more comprehensive classification
  const getPhoneNumberType = (parsedNumber: libphonenumber.PhoneNumber): string => {
    try {
      const type = parsedNumber.getType();
      switch(type) {
        case 'MOBILE':
          return 'mobile';
        case 'FIXED_LINE':
          return 'landline';
        case 'FIXED_LINE_OR_MOBILE':
          return 'service';
        case 'PREMIUM_RATE':
          return 'service';
        case 'TOLL_FREE':
          return 'service';
        default:
          return 'unknown';
      }
    } catch (error) {
      return 'unknown';
    }
  };

  // Handle file upload
  const handleFileUpload = (event: ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const data = results.data as CsvRow[];
        
        // Get column headers
        const headers = results.meta.fields || [];
        setCsvColumns(headers);
        
        // Set default column if available
        if (headers.length > 0) {
          // Try to find a column that might contain phone numbers
          const phoneColumnGuess = headers.find(header => 
            header.toLowerCase().includes('phone') || 
            header.toLowerCase().includes('mobile') || 
            header.toLowerCase().includes('tel') ||
            header.toLowerCase().includes('contact')
          ) || headers[0];
          
          setSelectedColumn(phoneColumnGuess);
        } else {
          // Handle the case where there are no headers
          setSelectedColumn('');
        }
        
        setRawCsvData(data);
        setFileUploaded(true);
        
        // Reset processed data
        setCsvData([]);
        setCleanedData([]);
        setInvalidNumbers([]);
      },
      error: (error: Error) => {
        console.error('Error parsing CSV:', error);
        // Handle case where CSV parsing fails completely
        setFileUploaded(true);
        setCsvColumns([]);
        setRawCsvData([]);
      }
    });
  };
  
  // Process data when column is selected
  const processData = (): void => {
    if (!selectedColumn || rawCsvData.length === 0) return;
    
    // Extract phone numbers from the selected column
    const phoneNumbers = rawCsvData
      .map(row => row[selectedColumn])
      .filter(number => 
        !!number && 
        typeof number === 'string' && 
        number.trim() !== ''
      );
    
    setCsvData(phoneNumbers);
    
    // Clean the phone numbers
    const cleanedResults = phoneNumbers.map(cleanPhoneNumber);
    
    // Separate valid and invalid numbers
    const valid = cleanedResults.filter(result => result.issues.length === 0);
    const invalid = cleanedResults.filter(result => result.issues.length > 0);
    
    setCleanedData(valid);
    setInvalidNumbers(invalid);
  };
  
  // Process data when selected column changes
  useEffect(() => {
    if (selectedColumn && rawCsvData.length > 0) {
      processData();
    }
  }, [selectedColumn]);

  // Download cleaned data
  const handleDownload = (): void => {
    // Prepare CSV data
    const csvContent = [
      ['Formatted Number', 'Country Code', 'Country', 'Mobile Number', 'Landline Number', 'Service Number']
    ];

    cleanedData.forEach(entry => {
      const row = [
        entry.formattedNumber || '',
        entry.countryCode || '',
        entry.country || '',
        entry.type === 'mobile' ? entry.formattedNumber || '' : '',
        entry.type === 'landline' ? entry.formattedNumber || '' : '',
        entry.type === 'service' ? entry.formattedNumber || '' : ''
      ];
      csvContent.push(row);
    });

    // Convert to CSV string
    const csvString = csvContent.map(e => e.join(",")).join("\n");
    
    // Create and download file
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", "cleaned_phone_numbers.csv");
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>
        <span style={{
          display: 'inline-block', 
          background: 'linear-gradient(135deg, #3498db, #2980b9)',
          color: 'transparent',
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
          padding: '0 10px',
        }}>
          Phone Number Cleaner
        </span>
      </h2>
      <p style={{
        textAlign: 'center',
        color: '#7f8c8d',
        fontSize: '16px',
        marginBottom: '25px',
      }}>
        Upload your CSV file to clean and standardize phone numbers
      </p>
      
      <div style={styles.fileInputContainer}>
        <label htmlFor="csvFileInput" style={{
        display: 'block',
        width: '100%',
        maxWidth: '450px',
        margin: '0 auto',
        cursor: 'pointer'
      }}>
        <div style={{
          textAlign: 'center',
          padding: '25px 15px',
          border: '2px dashed #3498db',
          borderRadius: '8px',
          backgroundColor: '#f0f7ff',
          transition: 'all 0.3s ease',
        }}>
          <div style={{ fontSize: '18px', marginBottom: '10px', color: '#2c3e50' }}>
            <span style={{ marginRight: '8px' }}>📁</span> 
            Upload CSV File with Phone Numbers
          </div>
          <div style={{ fontSize: '14px', color: '#7f8c8d' }}>
            Click or drag & drop to upload
          </div>
        </div>
        <input 
          id="csvFileInput"
          type="file" 
          accept=".csv"
          onChange={handleFileUpload}
          style={{ 
            position: 'absolute',
            width: '1px',
            height: '1px',
            padding: '0',
            margin: '-1px',
            overflow: 'hidden',
            clip: 'rect(0,0,0,0)',
            border: '0'
          }}
        />
      </label>
      </div>

      {csvData.length > 0 && (
        <div style={styles.resultsSummary}>
          <div>
            <h3 style={styles.subtitle}>
              Original Numbers: {csvData.length}
            </h3>
            <h3 style={styles.subtitle}>
              Valid Numbers: {cleanedData.length}
              {invalidNumbers.length > 0 && ` (Invalid: ${invalidNumbers.length})`}
            </h3>
          </div>
          <button 
            onClick={handleDownload}
            style={{
              ...styles.downloadButton,
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = '#2980b9';
              e.currentTarget.style.boxShadow = '0 4px 8px rgba(52, 152, 219, 0.4)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = '#3498db';
              e.currentTarget.style.boxShadow = '0 2px 5px rgba(52, 152, 219, 0.3)';
            }}
          >
            <span style={{ fontSize: '18px' }}>⬇️</span>
            Download Cleaned CSV
          </button>
        </div>
      )}

      {invalidNumbers.length > 0 && (
        <div style={styles.tableContainer}>
          <h3 style={styles.subtitle}>Invalid Numbers</h3>
          <table style={{...styles.table, ...styles.invalidTable}}>
            <thead>
              <tr style={{...styles.tableHeader}}>
                <th style={{
                  ...styles.tableCell,
                  fontWeight: 'bold',
                  color: 'white',
                  padding: '15px'
                }}>Original Number</th>
                <th style={{
                  ...styles.tableCell,
                  fontWeight: 'bold',
                  color: 'white',
                  padding: '15px'
                }}>Issues</th>
              </tr>
            </thead>
            <tbody>
              {invalidNumbers.map((entry, index) => (
                <tr 
                  key={index}
                  style={index % 2 === 0 ? {} : styles.tableRowEven}
                >
                  <td style={styles.tableCell}>{entry.originalNumber}</td>
                  <td style={styles.tableCell}>
                    {entry.issues.join(', ')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {cleanedData.length > 0 && (
        <div style={styles.tableContainer}>
          <h3 style={styles.subtitle}>Cleaned Numbers</h3>
          <table style={styles.table}>
            <thead>
              <tr style={{...styles.tableHeader}}>
                <th style={{
                  ...styles.tableCell,
                  fontWeight: 'bold',
                  color: 'white',
                  padding: '15px'
                }}>Original</th>
                <th style={{
                  ...styles.tableCell,
                  fontWeight: 'bold',
                  color: 'white',
                  padding: '15px'
                }}>Formatted</th>
                <th style={{
                  ...styles.tableCell,
                  fontWeight: 'bold',
                  color: 'white',
                  padding: '15px'
                }}>Type</th>
              </tr>
            </thead>
            <tbody>
              {cleanedData.map((entry, index) => (
                <tr 
                  key={index}
                  style={index % 2 === 0 ? {} : styles.tableRowEven}
                >
                  <td style={styles.tableCell}>{entry.originalNumber}</td>
                  <td style={styles.tableCell}>{entry.formattedNumber}</td>
                  <td style={styles.tableCell}>{entry.type}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default NumberTable;