import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { ComponentCategory } from '../types';

export interface BOMItem {
  designation: string;
  name: string;
  productNumber: string;
  footprint: string;
  quantity: number;
  unitPrice: number;
  supplier?: string;
  category: ComponentCategory;
}

export interface BOMParseResult {
  success: boolean;
  items: BOMItem[];
  errors: string[];
  totalItems: number;
}

// Mapping des colonnes possibles
const COLUMN_MAPPINGS = {
  designation: ['designation', 'description', 'desc', 'part_name', 'component'],
  name: ['name', 'ref', 'reference', 'part_ref', 'component_name'],
  productNumber: ['part_number', 'partnumber', 'pn', 'mpn', 'manufacturer_part_number', 'product_number'],
  footprint: ['footprint', 'package', 'case', 'form_factor'],
  quantity: ['quantity', 'qty', 'count', 'amount', 'number'],
  unitPrice: ['unit_price', 'price', 'cost', 'unit_cost', 'price_unit'],
  supplier: ['supplier', 'vendor', 'manufacturer', 'source'],
  category: ['category', 'type', 'family', 'group']
};

const CATEGORY_MAPPINGS: Record<string, ComponentCategory> = {
  // Résistances
  'resistor': 'resistance',
  'resistance': 'resistance',
  'resistances': 'resistance',
  'r': 'resistance',
  'res': 'resistance',
  
  // Condensateurs
  'capacitor': 'condensateur',
  'condensateur': 'condensateur',
  'condensateurs': 'condensateur',
  'c': 'condensateur',
  'cap': 'condensateur',
  
  // Relais
  'relay': 'relais',
  'relais': 'relais',
  'rel': 'relais',
  
  // Microcontrôleurs
  'microcontroller': 'microcontroleur',
  'microcontroleur': 'microcontroleur',
  'mcu': 'microcontroleur',
  'cpu': 'microcontroleur',
  'processor': 'microcontroleur',
  'stm32': 'microcontroleur',
  'arduino': 'microcontroleur',
  'esp32': 'microcontroleur',
  'esp8266': 'microcontroleur',
  'atmega': 'microcontroleur',
  'pic': 'microcontroleur',
  
  // Connecteurs
  'connector': 'connecteur',
  'connecteur': 'connecteur',
  'connecteurs': 'connecteur',
  'header': 'connecteur',
  'socket': 'connecteur',
  'plug': 'connecteur',
  'jack': 'connecteur',
  'usb': 'connecteur',
  'rj45': 'connecteur',
  
  // Inducteurs
  'inductor': 'inducteur',
  'inducteur': 'inducteur',
  'inducteurs': 'inducteur',
  'l': 'inducteur',
  'coil': 'inducteur',
  'choke': 'inducteur',
  
  // Diodes
  'diode': 'diode',
  'diodes': 'diode',
  'd': 'diode',
  'zener': 'diode',
  'schottky': 'diode',
  
  // Transistors
  'transistor': 'transistor',
  'transistors': 'transistor',
  'q': 'transistor',
  'mosfet': 'transistor',
  'bjt': 'transistor',
  'fet': 'transistor',
  'igbt': 'transistor',
  
  // Capteurs
  'sensor': 'capteur',
  'capteur': 'capteur',
  'capteurs': 'capteur',
  'temp': 'capteur',
  'temperature': 'capteur',
  'humidity': 'capteur',
  'pressure': 'capteur',
  'accelerometer': 'capteur',
  'gyroscope': 'capteur',
  'magnetometer': 'capteur',

  // Alimentations
  'alimentation': 'alimentation',
  'alimenattion': 'alimentation',
  'power': 'alimentation',
  'psu': 'alimentation',

  // Borniers
  'bornier': 'bornier',
  'terminal': 'bornier',
  'terminal_block': 'bornier',

  // Boutons / interrupteurs
  'bouton': 'bouton',
  'button': 'bouton',
  'switch': 'bouton',
  'tactile': 'bouton',

  // Expanseurs d'E/S
  'expanseur': 'expanseur',
  'expandeur': 'expanseur',
  'expender': 'expanseur',
  'expander': 'expanseur',
  'io_expander': 'expanseur',

  // Fusibles
  'fusible': 'fusible',
  'fuse': 'fusible',

  // LED
  'led': 'led',

  // Optocoupleurs
  'optocoupleur': 'optocoupleur',
  'optocoupler': 'optocoupleur',
  'opto': 'optocoupleur',

  // PCB
  'pcb': 'pcb',
  'carte': 'pcb',
  'board': 'pcb',

  // Régulateurs
  'regulateur': 'regulateur',
  'regulator': 'regulateur',
  'ldo': 'regulateur',
  'vreg': 'regulateur',

  // Supports
  'support': 'support',
  'support_fusible': 'support',
  'support_relai': 'support',
  'socket_relay': 'support',
  'holder': 'support',
};

function normalizeColumnName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '_');
}

function findColumnIndex(headers: string[], possibleNames: string[]): number {
  const normalizedHeaders = headers.map(h => normalizeColumnName(h));
  
  for (const name of possibleNames) {
    const index = normalizedHeaders.findIndex(h => h.includes(name) || name.includes(h));
    if (index !== -1) return index;
  }
  return -1;
}

function parseCategory(categoryStr: string, designation?: string, productNumber?: string): ComponentCategory {
  if (!categoryStr) {
    // Essayer de détecter la catégorie depuis la désignation ou le numéro de produit
    const searchText = `${designation || ''} ${productNumber || ''}`.toLowerCase();
    
    for (const [keyword, category] of Object.entries(CATEGORY_MAPPINGS)) {
      if (searchText.includes(keyword)) {
        return category;
      }
    }
    return 'autre';
  }
  
  const normalized = categoryStr.toLowerCase().trim();
  return CATEGORY_MAPPINGS[normalized] || 'autre';
}

function parseNumber(value: any): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const cleaned = value.replace(/[^\d.,]/g, '').replace(',', '.');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

export async function parseBOMFile(file: File): Promise<BOMParseResult> {
  const result: BOMParseResult = {
    success: false,
    items: [],
    errors: [],
    totalItems: 0
  };

  try {
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    
    if (fileExtension === 'csv') {
      return await parseCSVFile(file);
    } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
      return await parseExcelFile(file);
    } else if (fileExtension === 'txt' || fileExtension === 'md') {
      return await parseTextFile(file);
    } else {
      result.errors.push('Format de fichier non supporté. Utilisez .xlsx, .xls, .csv, .txt ou .md');
      return result;
    }
  } catch (error) {
    result.errors.push(`Erreur lors de la lecture du fichier: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    return result;
  }
}

async function parseCSVFile(file: File): Promise<BOMParseResult> {
  return new Promise((resolve) => {
    const result: BOMParseResult = {
      success: false,
      items: [],
      errors: [],
      totalItems: 0
    };

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results: any) => {
        try {
          const data = results.data as any[];
          result.totalItems = data.length;
          
          if (data.length === 0) {
            result.errors.push('Le fichier CSV est vide');
            resolve(result);
            return;
          }

          const headers = Object.keys(data[0]);
          const columnIndices = getColumnIndices(headers);

          if (columnIndices.designation === -1 || columnIndices.quantity === -1) {
            result.errors.push('Colonnes obligatoires manquantes: designation et quantity sont requises');
            resolve(result);
            return;
          }

          for (let i = 0; i < data.length; i++) {
            const row = data[i];
            try {
              const item = parseRowToBOMItem(row, columnIndices, headers);
              if (item) {
                result.items.push(item);
              }
            } catch (error) {
              result.errors.push(`Ligne ${i + 2}: ${error instanceof Error ? error.message : 'Erreur de parsing'}`);
            }
          }

          result.success = result.items.length > 0;
          resolve(result);
        } catch (error) {
          result.errors.push(`Erreur lors du parsing CSV: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
          resolve(result);
        }
      },
      error: (error: any) => {
        result.errors.push(`Erreur Papa Parse: ${error.message}`);
        resolve(result);
      }
    });
  });
}

async function parseExcelFile(file: File): Promise<BOMParseResult> {
  return new Promise((resolve) => {
    const result: BOMParseResult = {
      success: false,
      items: [],
      errors: [],
      totalItems: 0
    };

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Prendre la première feuille
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Convertir en JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
        
        if (jsonData.length < 2) {
          result.errors.push('Le fichier Excel doit contenir au moins une ligne d\'en-tête et une ligne de données');
          resolve(result);
          return;
        }

        const headers = jsonData[0].map(h => String(h || ''));
        const dataRows = jsonData.slice(1);
        result.totalItems = dataRows.length;

        const columnIndices = getColumnIndices(headers);

        if (columnIndices.designation === -1 || columnIndices.quantity === -1) {
          result.errors.push('Colonnes obligatoires manquantes: designation et quantity sont requises');
          resolve(result);
          return;
        }

        for (let i = 0; i < dataRows.length; i++) {
          const row = dataRows[i];
          try {
            // Convertir le tableau en objet
            const rowObj: any = {};
            headers.forEach((header, index) => {
              rowObj[header] = row[index];
            });

            const item = parseRowToBOMItem(rowObj, columnIndices, headers);
            if (item) {
              result.items.push(item);
            }
          } catch (error) {
            result.errors.push(`Ligne ${i + 2}: ${error instanceof Error ? error.message : 'Erreur de parsing'}`);
          }
        }

        result.success = result.items.length > 0;
        resolve(result);
      } catch (error) {
        result.errors.push(`Erreur lors du parsing Excel: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
        resolve(result);
      }
    };

    reader.onerror = () => {
      result.errors.push('Erreur lors de la lecture du fichier');
      resolve(result);
    };

    reader.readAsArrayBuffer(file);
  });
}

async function parseTextFile(file: File): Promise<BOMParseResult> {
  return new Promise((resolve) => {
    const result: BOMParseResult = {
      success: false,
      items: [],
      errors: [],
      totalItems: 0
    };

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const lines = content.split('\n').filter(line => line.trim());
        
        if (lines.length === 0) {
          result.errors.push('Le fichier texte est vide');
          resolve(result);
          return;
        }

        // Détecter le format du fichier
        const firstLine = lines[0].toLowerCase();
        let isTableFormat = false;
        let separator = '\t'; // Tab par défaut

        // Détecter les séparateurs
        if (firstLine.includes('|')) {
          separator = '|';
          isTableFormat = true;
        } else if (firstLine.includes('\t')) {
          separator = '\t';
          isTableFormat = true;
        } else if (firstLine.includes(',')) {
          separator = ',';
          isTableFormat = true;
        } else if (firstLine.includes(';')) {
          separator = ';';
          isTableFormat = true;
        }

        if (isTableFormat) {
          // Format tabulaire (CSV-like ou Markdown table)
          const data: any[] = [];
          const headers: string[] = [];
          
          lines.forEach((line, index) => {
            // Ignorer les lignes de séparation markdown (|---|---|)
            if (line.includes('---') || line.includes('===')) return;
            
            const cells = line.split(separator).map(cell => cell.trim().replace(/^\|+|\|+$/g, ''));
            
            if (index === 0) {
              // Première ligne = headers
              headers.push(...cells);
            } else {
              // Lignes de données
              const row: any = {};
              cells.forEach((cell, cellIndex) => {
                if (headers[cellIndex]) {
                  row[headers[cellIndex]] = cell;
                }
              });
              if (Object.keys(row).length > 0) {
                data.push(row);
              }
            }
          });

          result.totalItems = data.length;
          
          if (data.length === 0) {
            result.errors.push('Aucune donnée trouvée dans le fichier');
            resolve(result);
            return;
          }

          const columnIndices = getColumnIndices(headers);

          if (columnIndices.designation === -1 || columnIndices.quantity === -1) {
            result.errors.push('Colonnes obligatoires manquantes: designation et quantity sont requises');
            resolve(result);
            return;
          }

          data.forEach((row, index) => {
            try {
              const item = parseRowToBOMItem(row, columnIndices, headers);
              if (item) {
                result.items.push(item);
              }
            } catch (error) {
              result.errors.push(`Ligne ${index + 2}: ${error instanceof Error ? error.message : 'Erreur de parsing'}`);
            }
          });
        } else {
          // Format libre - essayer de parser chaque ligne
          lines.forEach((line, index) => {
            try {
              const item = parseFreeTextLine(line, index + 1);
              if (item) {
                result.items.push(item);
                result.totalItems++;
              }
            } catch (error) {
              result.errors.push(`Ligne ${index + 1}: ${error instanceof Error ? error.message : 'Erreur de parsing'}`);
            }
          });
        }

        result.success = result.items.length > 0;
        resolve(result);
      } catch (error) {
        result.errors.push(`Erreur lors du parsing du fichier texte: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
        resolve(result);
      }
    };

    reader.onerror = () => {
      result.errors.push('Erreur lors de la lecture du fichier');
      resolve(result);
    };

    reader.readAsText(file);
  });
}

function parseFreeTextLine(line: string, _lineNumber: number): BOMItem | null {
  // Patterns pour détecter les composants dans du texte libre
  const patterns = [
    // Format: R1 10kΩ 0603 100 0.02
    /^([A-Z]\d+)\s+([^\s]+)\s+(\w+)\s+(\d+)\s+([\d.,]+)/i,
    // Format: C1 100nF 0603 50 0.05
    /^([A-Z]\d+)\s+([^\s]+)\s+(\w+)\s+(\d+)\s+([\d.,]+)/i,
    // Format: U1 STM32F103 LQFP48 10 3.50
    /^([A-Z]\d+)\s+([^\s]+)\s+(\w+)\s+(\d+)\s+([\d.,]+)/i,
  ];

  for (const pattern of patterns) {
    const match = line.match(pattern);
    if (match) {
      const [, designation, name, footprint, quantityStr, priceStr] = match;
      
      const quantity = parseNumber(quantityStr);
      const unitPrice = parseNumber(priceStr);
      
      if (quantity <= 0) {
        throw new Error(`Quantité invalide: ${quantityStr}`);
      }

      return {
        designation: designation.trim(),
        name: name.trim(),
        productNumber: `PN-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        footprint: footprint.trim(),
        quantity,
        unitPrice,
        supplier: '',
        category: parseCategory('', designation, name),
      };
    }
  }

  return null;
}

function getColumnIndices(headers: string[]) {
  return {
    designation: findColumnIndex(headers, COLUMN_MAPPINGS.designation),
    name: findColumnIndex(headers, COLUMN_MAPPINGS.name),
    productNumber: findColumnIndex(headers, COLUMN_MAPPINGS.productNumber),
    footprint: findColumnIndex(headers, COLUMN_MAPPINGS.footprint),
    quantity: findColumnIndex(headers, COLUMN_MAPPINGS.quantity),
    unitPrice: findColumnIndex(headers, COLUMN_MAPPINGS.unitPrice),
    supplier: findColumnIndex(headers, COLUMN_MAPPINGS.supplier),
    category: findColumnIndex(headers, COLUMN_MAPPINGS.category),
  };
}

function parseRowToBOMItem(row: any, columnIndices: any, headers: string[]): BOMItem | null {
  const getValue = (index: number) => {
    if (index === -1) return '';
    const header = headers[index];
    return row[header] || '';
  };

  const designation = String(getValue(columnIndices.designation)).trim();
  const quantityStr = getValue(columnIndices.quantity);

  if (!designation || !quantityStr) {
    return null; // Skip empty rows
  }

  const quantity = parseNumber(quantityStr);
  if (quantity <= 0) {
    throw new Error(`Quantité invalide: ${quantityStr}`);
  }

  const name = String(getValue(columnIndices.name)).trim() || designation;
  const productNumber = String(getValue(columnIndices.productNumber)).trim() || `PN-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
  const footprint = String(getValue(columnIndices.footprint)).trim() || 'N/A';
  const unitPrice = parseNumber(getValue(columnIndices.unitPrice));
  const supplier = String(getValue(columnIndices.supplier)).trim() || '';
  const categoryStr = String(getValue(columnIndices.category)).trim();
  const category = parseCategory(categoryStr, designation, productNumber);

  return {
    designation,
    name,
    productNumber,
    footprint,
    quantity,
    unitPrice,
    supplier,
    category,
  };
}

export function validateBOMItems(items: BOMItem[]): string[] {
  const errors: string[] = [];
  const seenProductNumbers = new Set<string>();

  items.forEach((item, index) => {
    if (!item.designation.trim()) {
      errors.push(`Ligne ${index + 1}: Désignation manquante`);
    }
    
    if (item.quantity <= 0) {
      errors.push(`Ligne ${index + 1}: Quantité doit être supérieure à 0`);
    }

    if (seenProductNumbers.has(item.productNumber)) {
      errors.push(`Ligne ${index + 1}: Numéro de produit en double: ${item.productNumber}`);
    }
    seenProductNumbers.add(item.productNumber);
  });

  return errors;
}