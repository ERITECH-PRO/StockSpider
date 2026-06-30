import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Play, CheckCircle, ShoppingBag, AlertTriangle, X, Package, RefreshCw } from 'lucide-react';
import { apiService } from '../../services/api';
import { useToast } from '../../hooks/useToast';
import { Product } from '../../types';

type Action = 'start' | 'finish' | 'sell' | 'defect';

const ACTION_META: Record<Action, { label: string; verb: string; color: string; icon: any }> = {
  start: { label: 'Démarrer', verb: 'Démarrer l\'assemblage', color: 'bg-3s-blue', icon: Play },
  finish: { label: 'Terminer', verb: 'Terminer l\'assemblage', color: 'bg-green-600', icon: CheckCircle },
  sell: { label: 'Vendre', verb: 'Marquer comme vendu', color: 'bg-emerald-700', icon: ShoppingBag },
  defect: { label: 'Panne', verb: 'Marquer comme défectueux', color: 'bg-3s-red', icon: AlertTriangle },
};

const n = (v: any) => Number(v) || 0;

const ProductsInAssembly: React.FC = () => {
  const { showSuccess, showError } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [modal, setModal] = useState<{ product: Product; action: Action } | null>(null);
  const [qty, setQty] = useState(1);
  const [defectFrom, setDefectFrom] = useState<'in_progress' | 'assembled_finished'>('assembled_finished');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiService.getProducts();
      setProducts(data);
    } catch (e) {
      console.error('Erreur chargement produits:', e);
      showError('Erreur', 'Impossible de charger les produits');
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => { load(); }, [load]);

  const visible = useMemo(
    () => products
      .filter((p: any) => n(p.pcbRemaining) + n(p.inProgress) + n(p.assembledFinished) > 0)
      .sort((a: any, b: any) => n(b.inProgress) - n(a.inProgress)),
    [products]
  );

  const totals = useMemo(() => ({
    pcb: products.reduce((s, p: any) => s + n(p.pcbRemaining), 0),
    inProgress: products.reduce((s, p: any) => s + n(p.inProgress), 0),
    assembled: products.reduce((s, p: any) => s + n(p.assembledFinished), 0),
  }), [products]);

  const maxForModal = (): number => {
    if (!modal) return 0;
    const p: any = modal.product;
    switch (modal.action) {
      case 'start': return n(p.pcbRemaining);
      case 'finish': return n(p.inProgress);
      case 'sell': return n(p.assembledFinished);
      case 'defect': return defectFrom === 'in_progress' ? n(p.inProgress) : n(p.assembledFinished);
      default: return 0;
    }
  };

  const openModal = (product: Product, action: Action) => {
    const p: any = product;
    if (action === 'defect') setDefectFrom(n(p.assembledFinished) > 0 ? 'assembled_finished' : 'in_progress');
    setModal({ product, action });
    setQty(1);
  };

  const submit = async () => {
    if (!modal) return;
    const max = maxForModal();
    if (qty < 1 || qty > max) {
      showError('Quantité invalide', `Saisissez une valeur entre 1 et ${max}.`);
      return;
    }
    setBusy(true);
    try {
      await apiService.transitionProduct(
        modal.product.id,
        modal.action,
        qty,
        modal.action === 'defect' ? defectFrom : undefined
      );
      showSuccess('Transition effectuée', `${ACTION_META[modal.action].label} · ${modal.product.name} (${qty})`);
      setModal(null);
      await load();
    } catch (e: any) {
      showError('Échec de la transition', e?.message || 'Erreur serveur');
    } finally {
      setBusy(false);
    }
  };

  const Stat = ({ label, value, color }: any) => (
    <div className="card-3s p-4 flex flex-col">
      <span className="text-[11px] text-3s-gray-medium uppercase font-bold tracking-wider">{label}</span>
      <span className={`text-3xl font-black ${color}`}>{value.toLocaleString('fr-FR')}</span>
    </div>
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-3s-blue border-t-transparent"></div>
        <p className="text-3s-gray-medium animate-pulse">Chargement de l'atelier...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-3s-gray-light min-h-full font-inter">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-3s-black">Assemblage en cours</h1>
          <p className="text-3s-gray-medium mt-1 text-sm">Piloté en temps réel sur MySQL — chaque action met immédiatement la base à jour.</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-3s-black bg-white border border-gray-200 rounded-lg hover:bg-gray-50">
          <RefreshCw className="w-4 h-4" /> Rafraîchir
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Stat label="PCB nus" value={totals.pcb} color="text-gray-600" />
        <Stat label="En cours" value={totals.inProgress} color="text-yellow-600" />
        <Stat label="Assemblés" value={totals.assembled} color="text-3s-blue" />
      </div>

      {visible.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-dashed border-gray-300">
          <Package className="w-16 h-16 text-gray-200 mb-4" />
          <h3 className="text-lg font-semibold text-3s-black">Aucun produit en production</h3>
          <p className="text-3s-gray-medium text-sm">Aucun produit avec PCB, en cours ou assemblés.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {visible.map((p: any) => {
            const pcb = n(p.pcbRemaining), inp = n(p.inProgress), asm = n(p.assembledFinished), sold = n(p.sold), def = n(p.defective);
            return (
              <div key={p.id} className="card-3s flex flex-col overflow-hidden">
                <div className="p-4 border-b border-gray-100">
                  <h3 className="font-bold text-3s-black truncate">{p.name}</h3>
                  <p className="text-[10px] text-3s-gray-medium font-mono uppercase">{p.productNumber || 'NO-REF'}</p>
                </div>

                <div className="grid grid-cols-5 gap-1 p-3 text-center">
                  {[
                    { l: 'PCB', v: pcb, c: 'text-gray-600' },
                    { l: 'Cours', v: inp, c: 'text-yellow-600' },
                    { l: 'Assemb.', v: asm, c: 'text-3s-blue' },
                    { l: 'Vendu', v: sold, c: 'text-green-600' },
                    { l: 'Panne', v: def, c: 'text-3s-red' },
                  ].map((s) => (
                    <div key={s.l} className="bg-gray-50 rounded-lg py-2 border border-gray-100">
                      <div className={`text-base font-black ${s.c}`}>{s.v}</div>
                      <div className="text-[8px] font-bold text-3s-gray-medium uppercase">{s.l}</div>
                    </div>
                  ))}
                </div>

                <div className="mt-auto p-3 grid grid-cols-2 gap-2">
                  <button onClick={() => openModal(p, 'start')} disabled={pcb <= 0}
                    className="flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold text-white bg-3s-blue hover:bg-3s-blue-dark disabled:opacity-40 disabled:cursor-not-allowed">
                    <Play className="w-3.5 h-3.5" /> Démarrer
                  </button>
                  <button onClick={() => openModal(p, 'finish')} disabled={inp <= 0}
                    className="flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold text-white bg-green-600 hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed">
                    <CheckCircle className="w-3.5 h-3.5" /> Terminer
                  </button>
                  <button onClick={() => openModal(p, 'sell')} disabled={asm <= 0}
                    className="flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-40 disabled:cursor-not-allowed">
                    <ShoppingBag className="w-3.5 h-3.5" /> Vendre
                  </button>
                  <button onClick={() => openModal(p, 'defect')} disabled={inp + asm <= 0}
                    className="flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold text-white bg-3s-red hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed">
                    <AlertTriangle className="w-3.5 h-3.5" /> Panne
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => !busy && setModal(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg text-white ${ACTION_META[modal.action].color}`}>
                  {React.createElement(ACTION_META[modal.action].icon, { className: 'w-5 h-5' })}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-3s-black">{ACTION_META[modal.action].verb}</h2>
                  <p className="text-xs text-3s-gray-medium">{modal.product.name}</p>
                </div>
              </div>
              <button onClick={() => !busy && setModal(null)} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"><X className="w-5 h-5" /></button>
            </div>

            <div className="p-5 space-y-4">
              {modal.action === 'defect' && (
                <div>
                  <label className="block text-xs font-bold text-3s-gray-medium uppercase mb-2">Source</label>
                  <select value={defectFrom} onChange={(e) => { setDefectFrom(e.target.value as any); setQty(1); }}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-3s-blue">
                    <option value="assembled_finished">Depuis assemblés ({n((modal.product as any).assembledFinished)})</option>
                    <option value="in_progress">Depuis en cours ({n((modal.product as any).inProgress)})</option>
                  </select>
                </div>
              )}
              <div>
                <label className="block text-xs font-bold text-3s-gray-medium uppercase mb-2">Quantité (max {maxForModal()})</label>
                <input type="number" min={1} max={maxForModal()} value={qty}
                  onChange={(e) => setQty(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-3s-blue text-center font-bold" />
              </div>
              {modal.action === 'start' && (
                <p className="text-[11px] text-3s-gray-medium bg-blue-50 border border-blue-100 rounded-lg p-2">
                  Le démarrage consomme les composants de la nomenclature et enregistre les mouvements de stock. La transition échoue si le stock est insuffisant.
                </p>
              )}
            </div>

            <div className="flex justify-end gap-3 p-5 border-t border-gray-100">
              <button onClick={() => setModal(null)} disabled={busy} className="px-4 py-2 text-3s-black bg-gray-100 hover:bg-gray-200 rounded-lg disabled:opacity-50">Annuler</button>
              <button onClick={submit} disabled={busy || maxForModal() <= 0}
                className={`px-5 py-2 text-white rounded-lg font-bold disabled:opacity-50 ${ACTION_META[modal.action].color}`}>
                {busy ? '...' : 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductsInAssembly;
