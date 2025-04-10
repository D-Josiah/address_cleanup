import React, { useState, ChangeEvent } from 'react';
import Papa from 'papaparse';
import _ from 'lodash';

// Type definitions
interface ValidationResults {
  total: number;
  processed: number;
  nonLatinNames: number;
  suspiciousEntries: number;
  securityIssues: number;
  nullValues: number;
  issuesFound: number;
  commaFormatNames: number;
}

interface NameValidation {
  original: string;
  sanitized?: string;
  firstName: string;
  lastName: string;
  middleName: string;
  honorific: string;
  suffix: string;
  script: string;
  potentialIssues: string[];
  confidenceLevel: 'high' | 'medium' | 'low';
  isCommaFormat: boolean;
}

interface CSVRow {
  [key: string]: string | number | boolean | null;
  First_Name?: string;
  Last_Name?: string;
  Middle_Name?: string;
  Honorific?: string;
  Suffix?: string;
  Script?: string;
  Confidence?: string;
  Issues?: string;
}

type Script = 'latin' | 'cyrillic' | 'devanagari' | 'arabic' | 'han' | 'hiragana' | 'katakana' | 'hangul' | 'thai' | 'non-latin' | 'encoding-issue' | 'unknown';

// Common honorifics, prefixes, and suffixes
const HONORIFICS: string[] = [
  'mr', 'mrs', 'ms', 'miss', 'dr', 'prof', 'rev', 'hon', 'sir', 'madam', 'lord', 'lady',
  'capt', 'major', 'col', 'lt', 'cmdr', 'sgt'
];

const SUFFIXES: string[] = [
  'jr', 'sr', 'i', 'ii', 'iii', 'iv', 'v', 'phd', 'md', 'dds', 'esq'
];

// Known name particles that should not be capitalized conventionally
const NAME_PARTICLES: string[] = [
  'von', 'van', 'de', 'del', 'della', 'di', 'da', 'do', 'dos', 'das', 'du', 'la', 'le', 'el', 'les', 'lo', 'mac', 'mc',
  "o'", 'al', 'bin', 'ibn', 'ap', 'ben', 'bat', 'bint'
];

// Suspicious names that might be fake/test entries
const SUSPICIOUS_NAMES: string[] = [
  'test', 'user', 'admin', 'sample', 'demo', 'fake', 'anonymous', 'unknown', 'noreply', 'example',
  'null', 'undefined', 'n/a', 'na', 'none', 'blank'
];

// SQL injection and script patterns to watch for
const SECURITY_PATTERNS: string[] = [
  ');', '--', '/*', '*/', ';', 'drop', 'select', 'insert', 'update', 'delete', 'union', 'script', '<>'
];

const NameTable: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [csvData, setCsvData] = useState<CSVRow[]>([]);
  const [processedData, setProcessedData] = useState<CSVRow[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [nameColumn, setNameColumn] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [previewCount, setPreviewCount] = useState<number>(10); // Increased preview count
  const [processing, setProcessing] = useState<boolean>(false);
  const [processProgress, setProcessProgress] = useState<number>(0);
  const [validationResults, setValidationResults] = useState<ValidationResults>({
    total: 0,
    processed: 0,
    nonLatinNames: 0,
    suspiciousEntries: 0,
    securityIssues: 0,
    nullValues: 0,
    issuesFound: 0,
    commaFormatNames: 0
  });

  // Helper function to detect script/language and handle character encoding issues
  const detectScript = (text: string | null | undefined): Script => {
    if (!text || typeof text !== 'string') return 'unknown';
    
    // Check for character encoding issues
    if (text.includes('�') || /\uFFFD/.test(text)) {
      return 'encoding-issue';
    }
    
    // Check for commonly used scripts
    const scripts: Record<Script, RegExp> = {
      cyrillic: /[\u0400-\u04FF]/,                   // Russian, Ukrainian, etc.
      devanagari: /[\u0900-\u097F]/,                 // Hindi, Sanskrit, etc.
      arabic: /[\u0600-\u06FF\u0750-\u077F]/,        // Arabic, Persian, etc.
      han: /[\u4E00-\u9FFF\u3400-\u4DBF]/,           // Chinese, Japanese Kanji
      hiragana: /[\u3040-\u309F]/,                   // Japanese
      katakana: /[\u30A0-\u30FF]/,                   // Japanese
      hangul: /[\uAC00-\uD7AF\u1100-\u11FF]/,        // Korean
      thai: /[\u0E00-\u0E7F]/,                       // Thai
      latin: /^$/,                                   // Placeholder - logic below
      'non-latin': /^$/,                             // Placeholder - logic below
      'encoding-issue': /^$/,                        // Placeholder - won't be used
      'unknown': /^$/                                // Placeholder - won't be used
    };
    
    for (const [script, regex] of Object.entries(scripts)) {
      if (script !== 'latin' && script !== 'non-latin' && script !== 'encoding-issue' && script !== 'unknown' && regex.test(text)) {
        return script as Script;
      }
    }
    
    // If no special scripts are detected but there are non-Latin characters
    if (/[^\u0000-\u007F]/.test(text)) {
      return 'non-latin';
    }
    
    return 'latin';
  };

  // Helper function to check if a string is likely to contain code or SQL injection
  const containsSecurityThreat = (text: string | null | undefined): boolean => {
    if (!text || typeof text !== 'string') return false;
    const lowered = text.toLowerCase();
    return SECURITY_PATTERNS.some(pattern => lowered.includes(pattern.toLowerCase()));
  };

  // Helper function for proper capitalization with exceptions for name particles
  const properCapitalize = (name: string | null | undefined, isLastName: boolean = false): string => {
    if (!name) return '';
    
    // Skip capitalization for non-Latin scripts
    const script = detectScript(name);
    if (script !== 'latin' && script !== 'unknown') {
      return name;
    }
    
    // Handle hyphenated names
    if (name.includes('-')) {
      return name.split('-')
        .map(part => properCapitalize(part, isLastName))
        .join('-');
    }
    
    // Handle special case for McSomething and MacSomething
    if ((name.toLowerCase().startsWith('mc') || name.toLowerCase().startsWith('mac')) && name.length > 3) {
      const prefix = name.substring(0, name.toLowerCase().startsWith('mac') ? 3 : 2);
      const rest = name.substring(name.toLowerCase().startsWith('mac') ? 3 : 2);
      return prefix.charAt(0).toUpperCase() + prefix.slice(1).toLowerCase() + 
             rest.charAt(0).toUpperCase() + rest.slice(1).toLowerCase();
    }
    
    // Handle O'Something names
    if (name.toLowerCase().startsWith("o'") && name.length > 2) {
      return "O'" + name.charAt(2).toUpperCase() + name.slice(3).toLowerCase();
    }
    
    // Handle names with apostrophes in the middle (D'Artagnan)
    if (name.includes("'") && !name.toLowerCase().startsWith("o'")) {
      const parts = name.split("'");
      if (parts.length >= 2) {
        return parts[0].charAt(0).toUpperCase() + parts[0].slice(1).toLowerCase() + 
               "'" + (parts[1].charAt(0).toUpperCase() + parts[1].slice(1).toLowerCase());
      }
    }
    
    // Handle name particles
    for (const particle of NAME_PARTICLES) {
      if (name.toLowerCase() === particle) {
        return isLastName ? name.charAt(0).toUpperCase() + name.slice(1).toLowerCase() : name.toLowerCase();
      }
      
      if (name.toLowerCase().startsWith(particle.toLowerCase() + ' ')) {
        const particlePart = isLastName ? particle.charAt(0).toUpperCase() + particle.slice(1).toLowerCase() : particle.toLowerCase();
        const remainingPart = name.slice(particle.length + 1);
        return `${particlePart} ${properCapitalize(remainingPart, isLastName)}`;
      }
    }
    
    // Handle apostrophes (O'Brien)
    if (name.includes("'")) {
      const parts = name.split("'");
      return parts[0].charAt(0).toUpperCase() + parts[0].slice(1).toLowerCase() + 
             "'" + (parts[1] ? parts[1].charAt(0).toUpperCase() + parts[1].slice(1).toLowerCase() : '');
    }
    
    // Default capitalization
    return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
  };

  // Function to split and validate a name
  const validateName = (input: string | null | undefined): NameValidation => {
    // Handle null, undefined, etc.
    if (input === null || input === undefined || input === '') {
      return {
        original: input || '',
        firstName: '',
        lastName: '',
        middleName: '',
        honorific: '',
        suffix: '',
        script: 'unknown',
        potentialIssues: ['Null or empty name'],
        confidenceLevel: 'low',
        isCommaFormat: false
      };
    }

    // Ensure string type
    let inputStr = String(input).trim();
    
    // Initial sanitization - trim excess whitespace
    const sanitizedName = inputStr.replace(/\s+/g, ' ');
    
    // Initialize result object
    const result: NameValidation = {
      original: input,
      sanitized: sanitizedName,
      firstName: '',
      lastName: '',
      middleName: '',
      honorific: '',
      suffix: '',
      script: detectScript(sanitizedName),
      potentialIssues: [],
      confidenceLevel: 'high',
      isCommaFormat: false
    };
    
    // Check for empty input after sanitization
    if (!sanitizedName) {
      result.potentialIssues.push('Empty name after sanitization');
      result.confidenceLevel = 'low';
      return result;
    }
    
    // Check for suspicious test names
    if (SUSPICIOUS_NAMES.some(fake => sanitizedName.toLowerCase().includes(fake.toLowerCase()))) {
      result.potentialIssues.push('Name may be a test or placeholder');
      result.confidenceLevel = 'low';
    }
    
    // Check for security threats
    if (containsSecurityThreat(sanitizedName)) {
      result.potentialIssues.push('Name may contain code or SQL patterns');
      result.confidenceLevel = 'low';
    }
    
    // Handle encoding issues
    if (result.script === 'encoding-issue') {
      result.potentialIssues.push('Character encoding issues detected');
      result.confidenceLevel = 'low';
      
      // Try to fix common encoding problems
      const fixedName = sanitizedName
        .replace(/Ã¡/g, 'á')
        .replace(/Ã©/g, 'é')
        .replace(/Ã­/g, 'í')
        .replace(/Ã³/g, 'ó')
        .replace(/Ãº/g, 'ú')
        .replace(/Ã±/g, 'ñ')
        .replace(/Ã¤/g, 'ä')
        .replace(/Ã¶/g, 'ö')
        .replace(/Ã¼/g, 'ü')
        .replace(/Ã¨/g, 'è')
        .replace(/Ã´/g, 'ô')
        .replace(/Ã®/g, 'î')
        .replace(/�/g, '');
      
      if (fixedName !== sanitizedName) {
        result.sanitized = fixedName;
        result.potentialIssues.push('Attempted to fix encoding issues');
      }
    }
    
    // For non-Latin scripts, use a different approach
    if (result.script !== 'latin' && result.script !== 'unknown' && result.script !== 'encoding-issue') {
      // Handle non-Latin scripts differently based on script type
      
      // For many Asian languages that don't use spaces between words
      if (['han', 'hiragana', 'katakana', 'thai'].includes(result.script)) {
        if (sanitizedName.includes(' ')) {
          // If spaces exist, treat the first part as first name, rest as last name
          const parts = sanitizedName.split(' ');
          result.firstName = parts[0];
          result.lastName = parts.slice(1).join(' ');
        } else {
          // If no spaces, just use the whole thing as the last name
          result.lastName = sanitizedName;
          result.potentialIssues.push('Non-Latin name without spaces - assuming entire name is family name');
        }
        result.confidenceLevel = 'medium';
        return result;
      }
      
      // For languages that use spaces but different name order conventions
      result.potentialIssues.push('Non-Latin script detected - name splitting might be incorrect');
      result.confidenceLevel = 'medium';
    }
    
    // Handle comma-separated format (last name, first name)
    let processedName = sanitizedName;
    if (sanitizedName.includes(',')) {
      result.isCommaFormat = true;
      const parts = sanitizedName.split(',').map(p => p.trim());
      
      // In "LastName, FirstName MiddleName" format
      result.lastName = parts[0];
      
      if (parts.length > 1) {
        const remainingParts = parts[1].split(' ').filter(Boolean);
        if (remainingParts.length === 1) {
          result.firstName = remainingParts[0];
        } else if (remainingParts.length > 1) {
          result.firstName = remainingParts[0];
          result.middleName = remainingParts.slice(1).join(' ');
        }
      }
      
      // Apply proper capitalization
      result.lastName = properCapitalize(result.lastName, true);
      result.firstName = properCapitalize(result.firstName);
      
      if (result.middleName) {
        result.middleName = properCapitalize(result.middleName);
      }
      
      return result;
    }
    
    // Split the name into components
    const components = processedName.split(' ').filter(Boolean);
    
    // Process name components
    let remainingComponents = [...components];
    
    // Check for honorific
    if (components.length > 1) {
      const firstComponent = components[0].toLowerCase().replace(/\.$/, '');
      if (HONORIFICS.includes(firstComponent)) {
        result.honorific = properCapitalize(components[0]);
        remainingComponents.shift();
      }
    }
    
    // Check for suffix
    if (components.length > 1) {
      const lastComponent = components[components.length - 1].toLowerCase().replace(/\.$/, '').replace(/,/g, '');
      if (SUFFIXES.includes(lastComponent)) {
        result.suffix = lastComponent.toUpperCase();
        remainingComponents.pop();
      } else if (lastComponent.startsWith('jr') || lastComponent.startsWith('sr')) {
        result.suffix = lastComponent.toUpperCase();
        remainingComponents.pop();
      }
    }
    
    // Check if we have any components left to process
    if (remainingComponents.length === 0) {
      result.potentialIssues.push('Name consists of only honorifics/suffixes');
      result.confidenceLevel = 'low';
      return result;
    }
    
    // Now process first, middle, and last names
    if (remainingComponents.length === 1) {
      // Only one name component remaining - treat as first name
      result.firstName = properCapitalize(remainingComponents[0]);
      result.potentialIssues.push('Only a single name was provided');
      result.confidenceLevel = 'medium';
    } else if (remainingComponents.length === 2) {
      // Two components - treat as first and last name
      result.firstName = properCapitalize(remainingComponents[0]);
      result.lastName = properCapitalize(remainingComponents[1], true);
    } else if (remainingComponents.length >= 3) {
      // Multiple components - need more complex handling
      
      // Start with simple approach: first component is first name, last component is last name
      result.firstName = properCapitalize(remainingComponents[0]);
      result.lastName = properCapitalize(remainingComponents[remainingComponents.length - 1], true);
      
      // Everything in the middle is considered middle name(s)
      result.middleName = remainingComponents
        .slice(1, remainingComponents.length - 1)
        .map(name => properCapitalize(name))
        .join(' ');
    }
    
    return result;
  };

  const handleFileUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setFileName(selectedFile.name);
      setError('');
      
      // Read the file
      const reader = new FileReader();
      reader.onload = (e: ProgressEvent<FileReader>) => {
        try {
          setLoading(true);
          
          Papa.parse(e.target?.result as string, {
            header: true,
            skipEmptyLines: true,
            dynamicTyping: false,
            encoding: 'UTF-8',
            complete: (results: Papa.ParseResult<any>) => {
              if (results.data && results.data.length > 0) {
                setCsvData(results.data as CSVRow[]);
                setColumns(results.meta.fields || []);
                
                // Auto-detect the name column
                const possibleNameColumns = (results.meta.fields || []).filter(field => 
                  field.toLowerCase().includes('name') && 
                  !field.toLowerCase().includes('company') &&
                  !field.toLowerCase().includes('business') &&
                  !field.toLowerCase().includes('first') &&
                  !field.toLowerCase().includes('last')
                );
                
                if (possibleNameColumns.length > 0) {
                  setNameColumn(possibleNameColumns[0]);
                } else if ((results.meta.fields || []).length === 1) {
                  // If there's only one column, assume it's the name column
                  setNameColumn(results.meta.fields?.[0] || '');
                }
              } else {
                setError('No data found in the CSV file');
              }
              setLoading(false);
            },
            error: (error: Papa.ParseError) => {
              setError(`Error parsing CSV: ${error}`);
              setLoading(false);
            }
          });
        } catch (error) {
          setError(`Error reading file: ${(error as Error).message}`);
          setLoading(false);
        }
      };
      reader.readAsText(selectedFile, 'UTF-8');
    }
  };

  const processCSV = () => {
    if (csvData.length === 0) {
      setError('No data to process');
      return;
    }

    if (!nameColumn) {
      setError('Please select a name column to process');
      return;
    }

    setProcessing(true);
    setProcessProgress(0);
    
    // Reset validation results
    const results: ValidationResults = {
      total: csvData.length,
      processed: 0,
      nonLatinNames: 0,
      suspiciousEntries: 0,
      securityIssues: 0,
      nullValues: 0,
      issuesFound: 0,
      commaFormatNames: 0
    };

    // Process the data in chunks to avoid UI blocking
    const chunkSize = 100;
    const totalChunks = Math.ceil(csvData.length / chunkSize);
    
    // Create a copy of the original data to manipulate
    const newData = _.cloneDeep(csvData);
    
    const processChunk = (chunkIndex: number) => {
      const start = chunkIndex * chunkSize;
      const end = Math.min(start + chunkSize, csvData.length);
      
      for (let i = start; i < end; i++) {
        const row = newData[i];
        const nameValue = row[nameColumn] as string;
        
        // Process the name
        const nameValidation = validateName(nameValue);
        
        // Add the split name parts to the row
        row['First_Name'] = nameValidation.firstName;
        row['Last_Name'] = nameValidation.lastName;
        
        if (nameValidation.middleName) {
          row['Middle_Name'] = nameValidation.middleName;
        }
        
        if (nameValidation.honorific) {
          row['Honorific'] = nameValidation.honorific;
        }
        
        if (nameValidation.suffix) {
          row['Suffix'] = nameValidation.suffix;
        }
        
        // Add script/language detection
        row['Script'] = nameValidation.script;
        
        // Track comma format
        if (nameValidation.isCommaFormat) {
          results.commaFormatNames++;
        }
        
        results.processed++;
        
        // Track specific issue types
        if (nameValidation.script !== 'latin' && nameValidation.script !== 'unknown') {
          results.nonLatinNames++;
        }
        
        if (nameValidation.potentialIssues.some(issue => issue.includes('test') || issue.includes('placeholder'))) {
          results.suspiciousEntries++;
        }
        
        if (nameValidation.potentialIssues.some(issue => issue.includes('SQL') || issue.includes('code'))) {
          results.securityIssues++;
        }
        
        if (nameValidation.potentialIssues.some(issue => issue.includes('Null') || issue.includes('empty'))) {
          results.nullValues++;
        }
        
        if (nameValidation.potentialIssues.length > 0) {
          row['Issues'] = nameValidation.potentialIssues.join('; ');
          results.issuesFound++;
        }
        
        // Add confidence level
        row['Confidence'] = nameValidation.confidenceLevel;
      }
      
      const progressPct = Math.round(((chunkIndex + 1) / totalChunks) * 100);
      setProcessProgress(progressPct);
      
      if (chunkIndex + 1 < totalChunks) {
        // Process next chunk
        setTimeout(() => processChunk(chunkIndex + 1), 0);
      } else {
        // Done processing
        setProcessedData(newData);
        setValidationResults(results);
        setProcessing(false);
      }
    };
    
    // Start processing the first chunk
    processChunk(0);
  };

  const downloadProcessedCSV = () => {
    if (processedData.length === 0) {
      setError('No processed data to download');
      return;
    }
    
    // Create a new array with only the essential columns
    const simplifiedData = processedData.map(row => {
      return {
        'First_Name': row['First_Name'] || '',
        'Last_Name': row['Last_Name'] || ''
      };
    });
    
    const csv = Papa.unparse(simplifiedData, {
      encoding: 'UTF-8'
    });
    
    // Create Blob with BOM for proper UTF-8 handling
    const BOM = '\uFEFF'; // UTF-8 BOM
    const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.setAttribute('href', url);
    
    // Create a cleaned filename with 'split' appended
    const nameParts = fileName.split('.');
    const ext = nameParts.pop();
    const nameWithoutExt = nameParts.join('.');
    link.setAttribute('download', `${nameWithoutExt}_split.${ext}`);
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filterProblemNames = () => {
    // Only filter out severe issues: security threats and suspicious entries
    const filteredData = processedData.filter(row => {
      // Keep entries with medium or high confidence
      if (row['Confidence'] === 'high' || row['Confidence'] === 'medium') {
        return true;
      }
      
      // Keep entries with non-Latin scripts
      if (row['Script'] !== 'latin' && row['Script'] !== 'unknown') {
        return true;
      }
      
      // Filter out security threats and obvious test/fake names
      if (row['Issues'] && (
        (row['Issues'] as string).includes('security') || 
        (row['Issues'] as string).includes('SQL') || 
        (row['Issues'] as string).includes('code') ||
        (row['Issues'] as string).includes('test') ||
        (row['Issues'] as string).includes('placeholder') ||
        (row['Issues'] as string).includes('Null')
      )) {
        return false;
      }
      
      return true;
    });
    
    // Update the processed data and stats
    setProcessedData(filteredData);
    setValidationResults({
      ...validationResults,
      total: filteredData.length,
      processed: filteredData.length,
      securityIssues: 0,
      suspiciousEntries: 0,
      nullValues: 0
    });
  };

  return (
    <div className="name-splitter">
      <h2 className="name-splitter__title">Name Validator</h2>
      <p className="name-splitter__description">
        Upload a CSV with a single column of full names to validate them and split into First Name and Last Name.
        Handles international names, special characters, and detects suspicious entries. Fixes common encoding issues automatically.
      </p>
      
      <div className="name-splitter__section">
        <h3 className="name-splitter__section-title">1. Upload CSV File</h3>
        
        <div className="name-splitter__upload-area">
          {!file ? (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" className="name-splitter__upload-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
              </svg>
              <p className="name-splitter__upload-text">Drag & drop your CSV file here, or click to select</p>
              <input
                type="file"
                id="csvFileInput"
                accept=".csv"
                onChange={handleFileUpload}
                className="name-splitter__file-input"
              />
              <button
                onClick={() => document.getElementById('csvFileInput')?.click()}
                className="name-splitter__button name-splitter__button--primary"
              >
                Select File
              </button>
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" className="name-splitter__success-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="name-splitter__upload-text">File uploaded successfully:</p>
              <p className="name-splitter__filename">{fileName}</p>
              <div className="name-splitter__button-group">
                <button
                  onClick={() => {
                    setFile(null);
                    setFileName('');
                    setCsvData([]);
                    setColumns([]);
                    setProcessedData([]);
                  }}
                  className="name-splitter__button name-splitter__button--secondary"
                >
                  Remove File
                </button>
                <input
                  type="file"
                  id="csvFileInputChange"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="name-splitter__file-input"
                />
                <button
                  onClick={() => document.getElementById('csvFileInputChange')?.click()}
                  className="name-splitter__button name-splitter__button--primary"
                >
                  Change File
                </button>
              </div>
            </>
          )}
        </div>
        
        {error && (
          <div className="name-splitter__error">
            <p className="name-splitter__error-title">Error:</p>
            <p className="name-splitter__error-message">{error}</p>
          </div>
        )}
      </div>
      
      {columns.length > 0 && (
        <div className="name-splitter__section">
          <h3 className="name-splitter__section-title">2. Select Name Column</h3>
          
          <div className="name-splitter__form-group">
            <label htmlFor="nameColumn" className="name-splitter__label">Column containing full names:</label>
            <select
              id="nameColumn"
              value={nameColumn}
              onChange={(e: ChangeEvent<HTMLSelectElement>) => setNameColumn(e.target.value)}
              className="name-splitter__select"
            >
              <option value="">-- Select Column --</option>
              {columns.map((col, index) => (
                <option key={index} value={col}>{col}</option>
              ))}
            </select>
          </div>
        </div>
      )}
      
      {columns.length > 0 && csvData.length > 0 && (
        <div className="name-splitter__section">
          <h3 className="name-splitter__section-title">3. Preview Data</h3>
          
          <div className="name-splitter__form-group name-splitter__preview-control">
            <label htmlFor="previewCount" className="name-splitter__label">Records to preview:</label>
            <select
              id="previewCount"
              value={previewCount}
              onChange={(e: ChangeEvent<HTMLSelectElement>) => setPreviewCount(parseInt(e.target.value))}
              className="name-splitter__select name-splitter__select--small"
            >
              <option value="10">10 records</option>
              <option value="20">20 records</option>
              <option value="50">50 records</option>
              <option value="100">100 records</option>
            </select>
          </div>
          
          <div className="name-splitter__table-container">
            <table className="name-splitter__table">
              <thead>
                <tr>
                  <th className="name-splitter__th">#</th>
                  {nameColumn && <th className="name-splitter__th">{nameColumn}</th>}
                  
                  {columns.filter(col => col !== nameColumn).slice(0, 3).map((col, index) => (
                    <th key={index} className="name-splitter__th">{col}</th>
                  ))}
                  
                  {columns.length > 4 && <th className="name-splitter__th">...</th>}
                </tr>
              </thead>
              <tbody>
                {csvData.slice(0, previewCount).map((row, rowIndex) => (
                  <tr key={rowIndex} className={rowIndex % 2 === 0 ? 'name-splitter__tr--even' : 'name-splitter__tr--odd'}>
                    <td className="name-splitter__td">{rowIndex + 1}</td>
                    
                    {nameColumn && <td className="name-splitter__td">{row[nameColumn] as string}</td>}
                    {columns.filter(col => col !== nameColumn).slice(0, 3).map((col, colIndex) => (
                      <td key={colIndex} className="name-splitter__td">{row[col] as string}</td>
                    ))}
                    
                    {columns.length > 4 && <td className="name-splitter__td">...</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <p className="name-splitter__preview-info">
            Showing {Math.min(previewCount, csvData.length)} of {csvData.length} records
          </p>
        </div>
      )}
      
      {columns.length > 0 && (
        <div className="name-splitter__section">
          <h3 className="name-splitter__section-title">4. Process Names</h3>
          
          <div className="name-splitter__process-panel">
            {processing ? (
              <div className="name-splitter__processing">
                <p className="name-splitter__processing-text">Processing {csvData.length} names...</p>
                <div className="name-splitter__progress-container">
                  <div 
                    className="name-splitter__progress-bar" 
                    style={{ width: `${processProgress}%` }}
                  ></div>
                </div>
                <p className="name-splitter__progress-text">{processProgress}% complete</p>
              </div>
            ) : processedData.length > 0 ? (
              <div className="name-splitter__results">
                <div className="name-splitter__success-message">
                  <h4 className="name-splitter__success-title">Processing Complete!</h4>
                  <div className="name-splitter__stats-grid">
                    <div className="name-splitter__stat-card">
                      <p className="name-splitter__stat-label">Total Records</p>
                      <p className="name-splitter__stat-value">{validationResults.total}</p>
                    </div>
                    <div className="name-splitter__stat-card">
                      <p className="name-splitter__stat-label">Names Processed</p>
                      <p className="name-splitter__stat-value">{validationResults.processed}</p>
                    </div>
                    <div className="name-splitter__stat-card">
                      <p className="name-splitter__stat-label">Non-Latin Names</p>
                      <p className="name-splitter__stat-value">{validationResults.nonLatinNames}</p>
                    </div>
                    <div className="name-splitter__stat-card">
                      <p className="name-splitter__stat-label">Comma Format</p>
                      <p className="name-splitter__stat-value">{validationResults.commaFormatNames}</p>
                    </div>
                    <div className="name-splitter__stat-card">
                      <p className="name-splitter__stat-label">Security Issues</p>
                      <p className="name-splitter__stat-value">{validationResults.securityIssues}</p>
                    </div>
                    <div className="name-splitter__stat-card">
                      <p className="name-splitter__stat-label">Issues Found</p>
                      <p className="name-splitter__stat-value">{validationResults.issuesFound}</p>
                    </div>
                  </div>
                </div>
                
                <div className="name-splitter__table-container">
                  <h4 className="name-splitter__preview-title">Result Preview:</h4>
                  <table className="name-splitter__table">
                    <thead>
                      <tr>
                        <th className="name-splitter__th">#</th>
                        <th className="name-splitter__th">{nameColumn} (Original)</th>
                        <th className="name-splitter__th">First Name</th>
                        <th className="name-splitter__th">Last Name</th>
                        <th className="name-splitter__th">Middle Name</th>
                        <th className="name-splitter__th">Script</th>
                        <th className="name-splitter__th">Confidence</th>
                        <th className="name-splitter__th">Issues</th>
                      </tr>
                    </thead>
                    <tbody>
                      {processedData.slice(0, previewCount).map((row, rowIndex) => (
                        <tr key={rowIndex} className={rowIndex % 2 === 0 ? 'name-splitter__tr--even' : 'name-splitter__tr--odd'}>
                          <td className="name-splitter__td">{rowIndex + 1}</td>
                          <td className="name-splitter__td">{row[nameColumn] as string}</td>
                          <td className="name-splitter__td">{row['First_Name'] || '-'}</td>
                          <td className="name-splitter__td">{row['Last_Name'] || '-'}</td>
                          <td className="name-splitter__td">{row['Middle_Name'] || '-'}</td>
                          <td className="name-splitter__td">{row['Script'] || 'latin'}</td>
                          <td className="name-splitter__td">{row['Confidence'] || 'medium'}</td>
                          <td className="name-splitter__td">{row['Issues'] || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                <div className="name-splitter__button-group">
                  <button 
                    onClick={downloadProcessedCSV}
                    className="name-splitter__button name-splitter__button--primary name-splitter__button--download"
                  >
                    Download First/Last Names CSV
                  </button>
                  <button 
                    onClick={filterProblemNames}
                    className="name-splitter__button name-splitter__button--secondary"
                  >
                    Filter Out Problem Names
                  </button>
                </div>
                <p className="name-splitter__help-text">
                  The downloaded CSV will contain only First Name and Last Name columns. The "Filter Out Problem Names" 
                  button will remove only obvious issues like security threats and test entries while keeping all non-Latin 
                  names and entries with medium confidence levels.
                </p>
              </div>
            ) : (
              <div className="name-splitter__actions">
                <button 
                  onClick={processCSV}
                  className="name-splitter__button name-splitter__button--primary name-splitter__button--process"
                  disabled={loading || !nameColumn}
                >
                  Validate & Split Names
                </button>
                <p className="name-splitter__help-text">
                  This will validate each name, handle special characters and international names, detect issues, 
                  and split names into components like First Name, Last Name, etc. The tool automatically detects 
                  names in "Last Name, First Name" format.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NameTable;