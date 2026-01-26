import { useEffect, useMemo, useState } from 'react';
import { FileText, Plus, Trash2, Printer } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { useData } from '../../hooks/useData';
import { apiService } from '../../services/api';
import type { AppSettings, BonSortieDetail, BonSortieListItem, Chantier, Client, Product } from '../../types';
import BonSortiePrint from './BonSortiePrint';

type DraftItem = { productId: string; quantity: number };

const BonSortiePage = () => {
    const { user } = useAuth();
    const { showSuccess, showError } = useToast();
    const { products, loadData } = useData();
    const isAdmin = user?.role === 'admin';

    const [clients, setClients] = useState<Client[]>([]);
    const [chantiers, setChantiers] = useState<Chantier[]>([]);
    const [bons, setBons] = useState<BonSortieListItem[]>([]);
    const [settings, setSettings] = useState<AppSettings | null>(null);

    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [selectedClientId, setSelectedClientId] = useState('');
    const [selectedChantierId, setSelectedChantierId] = useState('');
    const [draftItems, setDraftItems] = useState<DraftItem[]>([]);
    const [productToAdd, setProductToAdd] = useState('');
    const [qtyToAdd, setQtyToAdd] = useState<number>(1);

    const [printBon, setPrintBon] = useState<BonSortieDetail | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);

    // Filtres
    const [searchTerm, setSearchTerm] = useState('');
    const [searchDate, setSearchDate] = useState('');

    const loadAll = async () => {
        setLoading(true);
        try {
            const [clientsData, chantiersData, bonsData, settingsData] = await Promise.all([
                apiService.getClients(),
                apiService.getChantiers(),
                apiService.getBonsSortie(),
                apiService.getSettings(),
            ]);
            setClients(clientsData);
            setChantiers(chantiersData);
            setBons(bonsData);
            setSettings(settingsData);
        } catch {
            showError('Erreur', 'Impossible de charger les données des bons de sortie');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadAll();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Filtrer chantiers par client si possible
    const availableChantiers = useMemo(() => {
        if (!selectedClientId) return chantiers;
        const filtered = chantiers.filter((c) => (c.clientId ? c.clientId === selectedClientId : true));
        return filtered.length > 0 ? filtered : chantiers;
    }, [chantiers, selectedClientId]);

    const productsById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

    const filteredBons = useMemo(() => {
        return bons.filter((b) => {
            const matchSearch =
                b.clientCompanyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                b.chantierName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                b.id.toLowerCase().includes(searchTerm.toLowerCase());

            const matchDate = searchDate ? new Date(b.createdAt).toISOString().split('T')[0] === searchDate : true;

            return matchSearch && matchDate;
        });
    }, [bons, searchTerm, searchDate]);

    const addItem = (overrideProductId?: string) => {
        const qty = Number(qtyToAdd || 0);
        const pid = overrideProductId ?? productToAdd;
        if (!pid || qty <= 0) return;
        setDraftItems((prev) => {
            const existing = prev.find((x) => x.productId === pid);
            if (existing) {
                return prev.map((x) => (x.productId === pid ? { ...x, quantity: x.quantity + qty } : x));
            }
            return [...prev, { productId: pid, quantity: qty }];
        });
        setProductToAdd('');
        setQtyToAdd(1);
    };

    const updateDraftQty = (productId: string, quantity: number) => {
        const q = Math.max(1, Number(quantity || 1));
        setDraftItems((prev) => prev.map((x) => (x.productId === productId ? { ...x, quantity: q } : x)));
    };

    const removeItem = (productId: string) => {
        setDraftItems((prev) => prev.filter((x) => x.productId !== productId));
    };

    const createBon = async () => {
        if (!isAdmin) return;
        if (!selectedClientId || !selectedChantierId) {
            showError('Erreur', 'Veuillez sélectionner un client et un chantier');
            return;
        }
        if (draftItems.length === 0) {
            showError('Erreur', 'Veuillez ajouter au moins un produit');
            return;
        }

        // check stock local (pré-check)
        const insufficient: string[] = [];
        draftItems.forEach((it) => {
            const p = productsById.get(it.productId);
            if (!p) return;
            if ((p.quantity || 0) < it.quantity) {
                insufficient.push(`${p.name} (dispo: ${p.quantity}, demandé: ${it.quantity})`);
            }
        });
        if (insufficient.length > 0) {
            showError('Stock insuffisant', insufficient.join('\n'));
            return;
        }

        setCreating(true);
        try {
            if (editingId) {
                await apiService.updateBonSortie(editingId, {
                    clientId: selectedClientId,
                    chantierId: selectedChantierId,
                    items: draftItems,
                });
                showSuccess('Bon de sortie mis à jour');
            } else {
                const res = await apiService.createBonSortie({
                    clientId: selectedClientId,
                    chantierId: selectedChantierId,
                    items: draftItems,
                });
                showSuccess('Bon de sortie créé', res.id);
            }

            setDraftItems([]);
            setSelectedClientId('');
            setSelectedChantierId('');
            setEditingId(null);
            await loadAll();
            await loadData(); // refresh produits/stock

            if (!editingId) {
                // En cas de création, on peut proposer l'impression directe
                const bonsData = await apiService.getBonsSortie();
                if (bonsData.length > 0) {
                    openPrint(bonsData[0].id);
                }
            }
        } catch (err) {
            showError('Erreur', err instanceof Error ? err.message : 'Action impossible');
        } finally {
            setCreating(false);
        }
    };

    const editBon = async (id: string) => {
        try {
            setLoading(true);
            const detail = await apiService.getBonSortie(id);
            setSelectedClientId(detail.clientId);
            setSelectedChantierId(detail.chantierId);
            setDraftItems(detail.items.map(it => ({
                productId: it.productId,
                quantity: it.quantity
            })));
            setEditingId(id);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (err) {
            showError('Erreur', 'Impossible de charger le bon pour modification');
        } finally {
            setLoading(false);
        }
    };

    const deleteBon = async (id: string) => {
        if (!window.confirm(`Êtes-vous sûr de vouloir supprimer le bon ${id} ? Le stock sera restauré.`)) return;

        try {
            await apiService.deleteBonSortie(id);
            showSuccess('Bon supprimé');
            await loadAll();
            await loadData();
        } catch (err) {
            showError('Erreur', err instanceof Error ? err.message : 'Suppression impossible');
        }
    };

    const openPrint = async (id: string) => {
        try {
            const detail = await apiService.getBonSortie(id);
            if (!settings) {
                const s = await apiService.getSettings();
                setSettings(s);
            }
            setPrintBon(detail);
        } catch (err) {
            showError('Erreur', err instanceof Error ? err.message : 'Impossible de charger le bon');
        }
    };

    const productsForSelect = useMemo(() => {
        // uniquement produits avec stock > 0 (on peut quand même laisser tous; ici filtré pour UX)
        const list = (products as Product[]).slice().sort((a, b) => a.name.localeCompare(b.name));
        return list;
    }, [products]);

    if (!isAdmin) {
        return (
            <div className="p-6">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h2 className="text-lg font-semibold text-gray-900">Accès réservé</h2>
                    <p className="text-gray-600 mt-1">Seuls les administrateurs peuvent créer des bons de sortie.</p>
                </div>
            </div>
        );
    }

    if (printBon && settings) {
        return <BonSortiePrint bon={printBon} settings={settings} onClose={() => setPrintBon(null)} />;
    }

    return (
        <div className="space-y-6 p-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Bons de sortie</h1>
                    <p className="text-gray-600">Créer et imprimer des bons de sortie (produits assemblés)</p>
                </div>
            </div>

            {loading ? (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-gray-600">Chargement...</div>
            ) : (
                <>
                    {/* Création */}
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <FileText className="w-5 h-5 text-blue-600" />
                                <h2 className="text-lg font-semibold text-gray-900">
                                    {editingId ? `Modifier le bon ${editingId}` : 'Créer un bon de sortie'}
                                </h2>
                            </div>
                            {editingId && (
                                <button
                                    onClick={() => {
                                        setEditingId(null);
                                        setDraftItems([]);
                                        setSelectedClientId('');
                                        setSelectedChantierId('');
                                    }}
                                    className="text-sm text-gray-500 hover:text-gray-700 underline"
                                >
                                    Annuler la modification
                                </button>
                            )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Client</label>
                                <select
                                    value={selectedClientId}
                                    onChange={(e) => {
                                        setSelectedClientId(e.target.value);
                                        setSelectedChantierId('');
                                    }}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="">— Sélectionner —</option>
                                    {clients.map((c) => (
                                        <option key={c.id} value={c.id}>
                                            {c.companyName}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Chantier</label>
                                <select
                                    value={selectedChantierId}
                                    onChange={(e) => setSelectedChantierId(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="">— Sélectionner —</option>
                                    {availableChantiers.map((c) => (
                                        <option key={c.id} value={c.id}>
                                            {c.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Produit assemblé</label>
                                <select
                                    value={productToAdd}
                                    onChange={(e) => {
                                        const pid = e.target.value;
                                        if (!pid) {
                                            setProductToAdd('');
                                            return;
                                        }
                                        // UX: dès qu'on sélectionne un produit, on l'ajoute à la liste
                                        setProductToAdd(pid);
                                        addItem(pid);
                                    }}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="">— Sélectionner —</option>
                                    {productsForSelect.map((p) => (
                                        <option key={p.id} value={p.id}>
                                            {(p.productNumber || p.id) + ' — ' + p.name + ` (stock: ${p.quantity})`}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex gap-3">
                                <div className="flex-1">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Quantité</label>
                                    <input
                                        type="number"
                                        min={1}
                                        value={qtyToAdd}
                                        onChange={(e) => setQtyToAdd(parseInt(e.target.value || '1', 10))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                                <button
                                    onClick={() => addItem()}
                                    disabled={!productToAdd || qtyToAdd <= 0}
                                    className="h-10 mt-7 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                                >
                                    <Plus className="w-4 h-4" /> Ajouter
                                </button>
                            </div>
                        </div>

                        <div className="mt-6">
                            {draftItems.length === 0 ? (
                                <div className="text-sm text-gray-500">Aucun produit ajouté (sélectionnez un produit ci-dessus).</div>
                            ) : (
                                <div className="border border-gray-200 rounded-lg overflow-hidden">
                                    <table className="w-full text-sm">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="text-left p-3">Produit</th>
                                                <th className="text-right p-3 w-28">Quantité</th>
                                                <th className="p-3 w-14"></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {draftItems.map((it) => {
                                                const p = productsById.get(it.productId);
                                                return (
                                                    <tr key={it.productId} className="border-t border-gray-200">
                                                        <td className="p-3">
                                                            <div className="font-medium text-gray-900">{p?.name || it.productId}</div>
                                                            <div className="text-xs text-gray-500">{p ? p.productNumber || p.id : ''}</div>
                                                        </td>
                                                        <td className="p-3 text-right">
                                                            <input
                                                                type="number"
                                                                min={1}
                                                                value={it.quantity}
                                                                onChange={(e) => updateDraftQty(it.productId, parseInt(e.target.value || '1', 10))}
                                                                className="w-20 text-right px-2 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                            />
                                                        </td>
                                                        <td className="p-3 text-right">
                                                            <button onClick={() => removeItem(it.productId)} className="p-1 text-gray-400 hover:text-red-600">
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>

                        <div className="mt-6 flex justify-end">
                            <button
                                onClick={createBon}
                                disabled={creating}
                                className={`px-4 py-2 text-white rounded-lg disabled:opacity-50 ${editingId ? 'bg-orange-600 hover:bg-orange-700' : 'bg-green-600 hover:bg-green-700'
                                    }`}
                            >
                                {creating ? 'Traitement...' : editingId ? 'Mettre à jour' : 'Créer & imprimer'}
                            </button>
                        </div>
                    </div>

                    {/* Liste */}
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                            <h2 className="text-lg font-semibold text-gray-900">Historique</h2>

                            <div className="flex flex-wrap items-center gap-3">
                                <input
                                    type="text"
                                    placeholder="Rechercher client, chantier ou N°..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 w-64"
                                />
                                <input
                                    type="date"
                                    value={searchDate}
                                    onChange={(e) => setSearchDate(e.target.value)}
                                    className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                                />
                                {(searchTerm || searchDate) && (
                                    <button
                                        onClick={() => {
                                            setSearchTerm('');
                                            setSearchDate('');
                                        }}
                                        className="text-sm text-blue-600 hover:text-blue-800"
                                    >
                                        Effacer
                                    </button>
                                )}
                            </div>
                        </div>

                        {filteredBons.length === 0 ? (
                            <div className="text-sm text-gray-500">Aucun bon de sortie trouvé.</div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="text-left p-3">Bon</th>
                                            <th className="text-left p-3">Client</th>
                                            <th className="text-left p-3">Chantier</th>
                                            <th className="text-left p-3">Date</th>
                                            <th className="text-right p-3">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredBons.map((b) => (
                                            <tr key={b.id} className="border-t border-gray-200">
                                                <td className="p-3 font-medium">{b.id}</td>
                                                <td className="p-3">{b.clientCompanyName}</td>
                                                <td className="p-3">{b.chantierName}</td>
                                                <td className="p-3">{new Date(b.createdAt).toLocaleDateString('fr-FR')}</td>
                                                <td className="p-3">
                                                    <div className="flex justify-end gap-2">
                                                        <button
                                                            onClick={() => openPrint(b.id)}
                                                            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                                            title="Voir / Imprimer"
                                                        >
                                                            <Printer className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => editBon(b.id)}
                                                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                            title="Modifier"
                                                        >
                                                            <FileText className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => deleteBon(b.id)}
                                                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                            title="Supprimer"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

export default BonSortiePage;
