import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { Component, ComponentCategory } from '../types';

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
  'resistor': 'resistance',
  'resistance': 'resistance',
  'resistances': 'resistance',
  'capacitor': 'condensateur',
  'condensateur': 'condensateur',
  'condensateurs': 'condensateur',
  'relay': 'relais',
  'relais': 'relais',
  'microcontroller': 'microcontroleur',
  'microcontroleur': 'microcontroleur',
  'mcu': 'microcontroleur',
  'connector': 'connecteur',
  'connecteur': 'connecteur',
  'inductor': 'inducteur',
  'inducteur': 'inducteur',
  'diode': 'diode',
  'diodes': 'diode',
  'transistor': 'transistor',
  'transistors': 'transistor',
  'sensor': 'capteur',
  'capteur': 'capteur',
  'capteurs': 'capteur',
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

function parseCategory(categoryStr: string): ComponentCategory {
  if (!categoryStr) return 'autre';
  
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
    } else {
      result.errors.push('Format de fichier non supporté. Utilisez .xlsx, .xls ou .csv');
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
      complete: (results) => {
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
      error: (error) => {
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
  const category = parseCategory(categoryStr);

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