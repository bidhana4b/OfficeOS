import { useState, useCallback } from 'react';
import { Upload, Download, CheckCircle, AlertCircle, Users, UserPlus, FileSpreadsheet, ArrowRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSupabase } from '@/hooks/useSupabase';
import { toast } from 'sonner';

type ImportType = 'clients' | 'team_members';

interface ColumnMapping {
  csvColumn: string;
  dbColumn: string;
}

interface ValidationError {
  row: number;
  column: string;
  value: string;
  error: string;
}

interface ImportResult {
  total: number;
  successful: number;
  failed: number;
  errors: ValidationError[];
}

const CLIENT_COLUMNS = [
  { value: 'business_name', label: 'Business Name', required: true },
  { value: 'contact_email', label: 'Email', required: true },
  { value: 'contact_phone', label: 'Phone', required: false },
  { value: 'contact_website', label: 'Website', required: false },
  { value: 'category', label: 'Category/Industry', required: false },
  { value: 'location', label: 'Location', required: false },
  { value: 'status', label: 'Status', required: false },
];

const TEAM_COLUMNS = [
  { value: 'display_name', label: 'Display Name', required: true },
  { value: 'email', label: 'Email', required: true },
  { value: 'role', label: 'Role', required: true },
  { value: 'phone', label: 'Phone', required: false },
  { value: 'skills', label: 'Skills (comma-separated)', required: false },
  { value: 'primary_role', label: 'Job Title', required: false },
];

export default function BulkImportTool() {
  const { supabase, user } = useSupabase();
  const [importType, setImportType] = useState<ImportType>('clients');
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<any[]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [columnMappings, setColumnMappings] = useState<ColumnMapping[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);

  const currentColumns = importType === 'clients' ? CLIENT_COLUMNS : TEAM_COLUMNS;

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      toast.error('Please upload a CSV file');
      return;
    }

    setCsvFile(file);
    const reader = new FileReader();

    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        toast.error('CSV file must have headers and at least one data row');
        return;
      }

      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
      const data = lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
        return headers.reduce((obj, header, index) => {
          obj[header] = values[index] || '';
          return obj;
        }, {} as any);
      });

      setCsvHeaders(headers);
      setCsvData(data);
      
      // Auto-map columns based on similar names
      const autoMappings = currentColumns.map(col => {
        const matchingHeader = headers.find(h => 
          h.toLowerCase().replace(/[_\s]/g, '') === col.value.toLowerCase().replace(/[_\s]/g, '')
        );
        return {
          csvColumn: matchingHeader || '',
          dbColumn: col.value,
        };
      });
      setColumnMappings(autoMappings);
      toast.success(`Loaded ${data.length} rows from CSV`);
    };

    reader.readAsText(file);
  }, [currentColumns]);

  const updateMapping = useCallback((dbColumn: string, csvColumn: string) => {
    setColumnMappings(prev => 
      prev.map(m => m.dbColumn === dbColumn ? { ...m, csvColumn } : m)
    );
  }, []);

  const validateData = useCallback(() => {
    const errors: ValidationError[] = [];
    
    csvData.forEach((row, index) => {
      columnMappings.forEach(mapping => {
        const column = currentColumns.find(c => c.value === mapping.dbColumn);
        if (!column) return;

        const value = row[mapping.csvColumn];

        // Check required fields
        if (column.required && (!value || value.trim() === '')) {
          errors.push({
            row: index + 1,
            column: column.label,
            value: value || '(empty)',
            error: 'Required field is empty',
          });
        }

        // Validate email format
        if ((column.value === 'email' || column.value === 'contact_email') && value) {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(value)) {
            errors.push({
              row: index + 1,
              column: column.label,
              value,
              error: 'Invalid email format',
            });
          }
        }

        // Validate role for team members
        if (importType === 'team_members' && column.value === 'role' && value) {
          const validRoles = ['designer', 'account_manager', 'media_buyer', 'finance', 'admin'];
          if (!validRoles.includes(value.toLowerCase())) {
            errors.push({
              row: index + 1,
              column: column.label,
              value,
              error: `Invalid role. Must be one of: ${validRoles.join(', ')}`,
            });
          }
        }
      });
    });

    setValidationErrors(errors);
    return errors.length === 0;
  }, [csvData, columnMappings, currentColumns, importType]);

  const processImport = useCallback(async () => {
    if (!validateData()) {
      toast.error('Please fix validation errors before importing');
      return;
    }

    setIsProcessing(true);
    setProgress(0);
    
    const results: ImportResult = {
      total: csvData.length,
      successful: 0,
      failed: 0,
      errors: [],
    };

    try {
      for (let i = 0; i < csvData.length; i++) {
        const row = csvData[i];
        const mappedData: any = {};

        // Map CSV columns to DB columns
        columnMappings.forEach(mapping => {
          if (mapping.csvColumn && row[mapping.csvColumn]) {
            mappedData[mapping.dbColumn] = row[mapping.csvColumn];
          }
        });

        // Add tenant_id
        mappedData.tenant_id = user?.tenant_id;

        try {
          if (importType === 'clients') {
            // Create client
            const { data: client, error: clientError } = await supabase
              .from('clients')
              .insert({
                ...mappedData,
                status: mappedData.status || 'active',
              })
              .select()
              .single();

            if (clientError) throw clientError;

            // Auto-create wallet
            const { error: walletError } = await supabase
              .from('client_wallets')
              .insert({
                client_id: client.id,
                tenant_id: user?.tenant_id,
                balance: 0,
                currency: 'BDT',
              });

            if (walletError) throw walletError;

            // Auto-create workspace
            const { error: workspaceError } = await supabase
              .from('workspaces')
              .insert({
                name: `${client.business_name} Workspace`,
                client_id: client.id,
                tenant_id: user?.tenant_id,
              });

            if (workspaceError) throw workspaceError;

            results.successful++;
          } else {
            // Create user profile
            const { data: profile, error: profileError } = await supabase
              .from('user_profiles')
              .insert({
                ...mappedData,
                tenant_id: user?.tenant_id,
              })
              .select()
              .single();

            if (profileError) throw profileError;

            // Create demo_user
            const { data: demoUser, error: demoError } = await supabase
              .from('demo_users')
              .insert({
                email: mappedData.email,
                display_name: mappedData.display_name,
                role: mappedData.role,
                tenant_id: user?.tenant_id,
                user_profile_id: profile.id,
                password_hash: 'temp123', // Temporary password
              })
              .select()
              .single();

            if (demoError) throw demoError;

            // Create team_member
            const skills = mappedData.skills ? mappedData.skills.split(',').map((s: string) => s.trim()) : [];
            const { error: teamError } = await supabase
              .from('team_members')
              .insert({
                name: mappedData.display_name || profile.display_name,
                email: mappedData.email,
                user_profile_id: profile.id,
                primary_role: mappedData.primary_role || mappedData.role,
                skill_tags: skills,
                tenant_id: user?.tenant_id,
                status: 'active',
              });

            if (teamError) throw teamError;

            results.successful++;
          }
        } catch (error: any) {
          results.failed++;
          results.errors.push({
            row: i + 1,
            column: 'Import',
            value: JSON.stringify(mappedData),
            error: error.message || 'Unknown error',
          });
        }

        setProgress(((i + 1) / csvData.length) * 100);
      }

      setImportResult(results);
      
      if (results.successful > 0) {
        toast.success(`Successfully imported ${results.successful} ${importType}`);
      }
      if (results.failed > 0) {
        toast.error(`${results.failed} ${importType} failed to import`);
      }
    } catch (error: any) {
      toast.error(`Import failed: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  }, [csvData, columnMappings, importType, validateData, supabase, user]);

  const downloadTemplate = useCallback(() => {
    const headers = currentColumns.map(c => c.value).join(',');
    const sampleRow = currentColumns.map(c => {
      if (c.value === 'email' || c.value === 'contact_email') return 'user@example.com';
      if (c.value === 'role') return 'designer';
      if (c.value === 'status') return 'active';
      if (c.value === 'category') return 'E-commerce';
      if (c.value === 'location') return 'Dhaka, Bangladesh';
      return `Sample ${c.label}`;
    }).join(',');
    
    const csv = `${headers}\n${sampleRow}`;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${importType}_template.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  }, [importType, currentColumns]);

  const resetImport = useCallback(() => {
    setCsvFile(null);
    setCsvData([]);
    setCsvHeaders([]);
    setColumnMappings([]);
    setValidationErrors([]);
    setImportResult(null);
    setProgress(0);
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display font-bold text-3xl text-white">Bulk Import Tool</h2>
          <p className="text-sm text-white/60 mt-1">Import multiple clients or team members from CSV</p>
        </div>
        <Button onClick={downloadTemplate} variant="outline" size="sm">
          <Download className="w-4 h-4 mr-2" />
          Download Template
        </Button>
      </div>

      {/* Import Type Selection */}
      <Card className="p-6">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-white/80">Import Type:</label>
          <div className="flex gap-2">
            <Button
              onClick={() => setImportType('clients')}
              variant={importType === 'clients' ? 'default' : 'outline'}
              size="sm"
            >
              <Users className="w-4 h-4 mr-2" />
              Clients
            </Button>
            <Button
              onClick={() => setImportType('team_members')}
              variant={importType === 'team_members' ? 'default' : 'outline'}
              size="sm"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Team Members
            </Button>
          </div>
        </div>
      </Card>

      {/* File Upload */}
      {!csvFile && (
        <Card className="p-12">
          <label className="flex flex-col items-center justify-center cursor-pointer group">
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="hidden"
            />
            <div className="w-24 h-24 rounded-2xl bg-cyan-500/20 border-2 border-cyan-500/40 flex items-center justify-center mb-4 group-hover:border-cyan-500/60 transition-colors">
              <Upload className="w-12 h-12 text-cyan-400" />
            </div>
            <h3 className="font-display font-bold text-xl text-white mb-2">Upload CSV File</h3>
            <p className="text-sm text-white/60 text-center max-w-md">
              Click to browse or drag and drop your CSV file here
              <br />
              <span className="text-xs text-white/40 mt-1 block">Supported format: .csv</span>
            </p>
          </label>
        </Card>
      )}

      {/* Column Mapping */}
      {csvFile && !importResult && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="w-6 h-6 text-purple-400" />
              <div>
                <h3 className="font-display font-bold text-lg text-white">Column Mapping</h3>
                <p className="text-sm text-white/60">Map CSV columns to database fields</p>
              </div>
            </div>
            <Button onClick={resetImport} variant="ghost" size="sm">
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
          </div>

          <div className="space-y-3">
            {currentColumns.map((column) => {
              const mapping = columnMappings.find(m => m.dbColumn === column.value);
              return (
                <div key={column.value} className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white/90">{column.label}</span>
                      {column.required && (
                        <Badge variant="outline" className="text-xs">Required</Badge>
                      )}
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-white/40" />
                  <div className="flex-1">
                    <Select
                      value={mapping?.csvColumn || ''}
                      onValueChange={(value) => updateMapping(column.value, value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select CSV column" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">-- Not Mapped --</SelectItem>
                        {csvHeaders.map(header => (
                          <SelectItem key={header} value={header}>{header}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              );
            })}
          </div>

          {validationErrors.length > 0 && (
            <div className="mt-6 rounded-xl bg-red-500/10 border border-red-500/30 p-4">
              <div className="flex items-center gap-2 mb-3">
                <AlertCircle className="w-5 h-5 text-red-400" />
                <span className="font-medium text-red-400">Validation Errors ({validationErrors.length})</span>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {validationErrors.slice(0, 10).map((error, idx) => (
                  <div key={idx} className="text-xs text-red-400/80 font-mono">
                    Row {error.row}, {error.column}: {error.error} (value: "{error.value}")
                  </div>
                ))}
                {validationErrors.length > 10 && (
                  <p className="text-xs text-red-400/60">...and {validationErrors.length - 10} more errors</p>
                )}
              </div>
            </div>
          )}

          <div className="mt-6 flex gap-3">
            <Button onClick={validateData} variant="outline">
              Validate Data
            </Button>
            <Button 
              onClick={processImport} 
              disabled={isProcessing || validationErrors.length > 0}
              className="flex-1"
            >
              {isProcessing ? 'Processing...' : `Import ${csvData.length} ${importType}`}
            </Button>
          </div>
        </Card>
      )}

      {/* Progress */}
      {isProcessing && (
        <Card className="p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-white/80">Importing...</span>
              <span className="text-sm font-mono text-white/60">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </Card>
      )}

      {/* Results */}
      {importResult && (
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <CheckCircle className="w-6 h-6 text-lime-400" />
            <div>
              <h3 className="font-display font-bold text-lg text-white">Import Complete</h3>
              <p className="text-sm text-white/60">Summary of import operation</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="rounded-xl bg-white/5 border border-white/10 p-4">
              <p className="text-sm text-white/60 mb-1">Total Records</p>
              <p className="font-display font-bold text-3xl text-white">{importResult.total}</p>
            </div>
            <div className="rounded-xl bg-lime-500/10 border border-lime-500/30 p-4">
              <p className="text-sm text-lime-400/80 mb-1">Successful</p>
              <p className="font-display font-bold text-3xl text-lime-400">{importResult.successful}</p>
            </div>
            <div className="rounded-xl bg-red-500/10 border border-red-500/30 p-4">
              <p className="text-sm text-red-400/80 mb-1">Failed</p>
              <p className="font-display font-bold text-3xl text-red-400">{importResult.failed}</p>
            </div>
          </div>

          {importResult.errors.length > 0 && (
            <div className="rounded-xl bg-red-500/10 border border-red-500/30 p-4 mb-6">
              <div className="flex items-center gap-2 mb-3">
                <AlertCircle className="w-5 h-5 text-red-400" />
                <span className="font-medium text-red-400">Import Errors ({importResult.errors.length})</span>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {importResult.errors.slice(0, 10).map((error, idx) => (
                  <div key={idx} className="text-xs text-red-400/80 font-mono">
                    Row {error.row}: {error.error}
                  </div>
                ))}
                {importResult.errors.length > 10 && (
                  <p className="text-xs text-red-400/60">...and {importResult.errors.length - 10} more errors</p>
                )}
              </div>
            </div>
          )}

          <Button onClick={resetImport} variant="outline" className="w-full">
            Import Another File
          </Button>
        </Card>
      )}
    </div>
  );
}
