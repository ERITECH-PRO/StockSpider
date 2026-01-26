import React, { useMemo } from 'react';
import type { AppSettings, BonSortieDetail } from '../../types';
import { getImageUrl } from '../../services/api';

interface BonSortiePrintProps {
  bon: BonSortieDetail;
  settings: AppSettings;
  onClose: () => void;
}

const BonSortiePrint: React.FC<BonSortiePrintProps> = ({ bon, settings, onClose }) => {
  const createdDate = useMemo(() => new Date(bon.createdAt).toLocaleDateString('fr-FR'), [bon.createdAt]);

  return (
    <div className="p-6">
      <style>
        {`
          @media print {
            .no-print { display: none !important; }
            /* N'imprimer QUE le bon de sortie, pas toute l'app (sidebar/header/etc.) */
            body * { visibility: hidden !important; }
            #bon-sortie-print, #bon-sortie-print * { visibility: visible !important; }
            #bon-sortie-print { position: fixed; left: 0; top: 0; width: 100%; }
            body { background: white !important; }
          }
          @page {
            margin: 12mm;
          }
        `}
      </style>

      <div className="no-print flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Bon de sortie {bon.id}</h2>
          <p className="text-sm text-gray-600">Généré le {createdDate}</p>
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="px-4 py-2 bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200">
            Retour
          </button>
          <button onClick={() => window.print()} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Imprimer / PDF
          </button>
        </div>
      </div>

      <div
        id="bon-sortie-print"
        className="bg-white border border-gray-200 rounded-lg p-8 print:p-0 print:border-0 flex flex-col min-h-[100vh]"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-6">
          <div className="w-40 h-24 flex items-center">
            {settings.company.logoUrl ? (
              <img src={getImageUrl(settings.company.logoUrl)} alt="Logo" className="max-w-full max-h-24 object-contain" />
            ) : (
              <div className="text-sm text-gray-400">Logo</div>
            )}
          </div>
          <div className="text-right">
            <div className="text-lg font-semibold text-gray-900">{settings.company.name}</div>
            {settings.company.address && <div className="text-sm text-gray-700 whitespace-pre-line">{settings.company.address}</div>}
            <div className="text-sm text-gray-700">
              {settings.company.email && <div>{settings.company.email}</div>}
              {settings.company.phone && <div>{settings.company.phone}</div>}
              {settings.company.matriculeFiscal && <div>M.F: {settings.company.matriculeFiscal}</div>}
            </div>
          </div>
        </div>

        {/* Client / BS Info Boxes */}
        <div className="mt-4 grid grid-cols-2 gap-6">
          <div className="border border-gray-400 rounded-lg p-4 bg-gray-50 flex flex-col justify-center">
            <h1 className="text-xl font-bold text-gray-900 uppercase">BON DE SORTIE</h1>
            <div className="text-sm text-gray-700 mt-2">
              <span className="font-semibold text-gray-900">N°:</span> {bon.id}
            </div>
            <div className="text-sm text-gray-700">
              <span className="font-semibold text-gray-900">Date:</span> {createdDate}
            </div>
          </div>

          <div className="border border-gray-400 rounded-lg p-4">
            <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">Code Client: {bon.clientId}</div>
            <div className="font-semibold text-gray-900">Client: {bon.clientCompanyName}</div>
            {bon.clientAddress && <div className="text-sm text-gray-700 whitespace-pre-line">Adresse: {bon.clientAddress}</div>}
            <div className="text-sm text-gray-700 mt-2">
              {bon.clientEmail && <div>Email: {bon.clientEmail}</div>}
              {/* @ts-ignore - The detail type might need expansion if not refreshed */}
              {bon.clientMatriculeFiscal && <div>M.F: {bon.clientMatriculeFiscal}</div>}
              {bon.clientPhone && <div>Tel: {bon.clientPhone}</div>}
            </div>
          </div>
        </div>

        {/* Chantier info on a single line */}
        <div className="mt-2 px-4 py-2 border border-gray-400 rounded-lg bg-gray-50 flex items-center gap-4">
          <span className="text-xs text-gray-500 uppercase tracking-wide font-medium">Chantier:</span>
          <span className="font-semibold text-gray-900">{bon.chantierName}</span>
          {bon.chantierAddress && (
            <>
              <span className="text-gray-300">|</span>
              <span className="text-sm text-gray-700">{bon.chantierAddress}</span>
            </>
          )}
        </div>

        {/* Table + lignes verticales (jusqu'aux signatures) */}
        <div className="mt-2 relative flex-1 border-x border-t border-gray-400">
          {/* Séparateurs colonnes (Largeur fixe pour Code et Quantité) */}
          <div className="absolute top-0 bottom-0 left-32 border-l border-gray-400 z-20 pointer-events-none" />
          <div className="absolute top-0 bottom-0 right-20 border-l border-gray-400 z-20 pointer-events-none" />

          <table className="w-full text-sm relative z-10 bg-transparent table-fixed">
            <thead className="bg-gray-50 text-gray-900 font-bold">
              <tr>
                <th className="text-left p-3 border-b border-gray-400 w-32">Code</th>
                <th className="text-left p-3 border-b border-gray-400 border-l border-gray-400">Désignation</th>
                <th className="text-right p-3 border-b border-gray-400 border-l border-gray-400 w-20">QTE</th>
              </tr>
            </thead>
            <tbody>
              {bon.items.map((it) => (
                <tr key={it.id}>
                  <td className="p-3 border-b border-gray-300 truncate">
                    <div className="font-medium text-gray-900">
                      {it.productName}
                    </div>
                  </td>
                  <td className="p-3 border-b border-gray-300 border-l border-gray-400 text-gray-700">{it.productDescription || ''}</td>
                  <td className="p-3 border-b border-gray-300 border-l border-gray-400 text-right font-medium">{it.quantity}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Signatures */}
        <div className="border-t border-gray-400 pt-10 grid grid-cols-2 gap-6">
          <div className="border border-gray-300 rounded-lg h-28 p-3">
            <div className="text-xs text-gray-500 uppercase tracking-wide text-center">Signature client</div>
          </div>
          <div className="border border-gray-300 rounded-lg h-28 p-3">
            <div className="text-xs text-gray-500 uppercase tracking-wide text-center">Signature responsable</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BonSortiePrint;


