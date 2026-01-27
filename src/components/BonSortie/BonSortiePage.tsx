import { useEffect, useMemo, useState } from 'react';
import { FileText, Plus, Trash2, Printer, Search, Calendar, User, Layout, Package, CheckCircle2, AlertCircle, History, ArrowRight, X, ShieldCheck, Edit } from 'lucide-react';
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

    const [, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [selectedClientId, setSelectedClientId] = useState('');
    const [selectedChantierId, setSelectedChantierId] = useState('');
    const [personnel, setPersonnel] = useState('');
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
                    personnel: personnel || undefined,
                    items: draftItems,
                });
                showSuccess('Bon de sortie mis à jour');
            } else {
                const res = await apiService.createBonSortie({
                    clientId: selectedClientId,
                    chantierId: selectedChantierId,
                    personnel: personnel || undefined,
                    items: draftItems,
                });
                showSuccess('Bon de sortie créé', res.id);
            }

            setDraftItems([]);
            setSelectedClientId('');
            setSelectedChantierId('');
            setPersonnel('');
            setEditingId(null);
            await loadAll();
            await loadData();

            if (!editingId) {
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
            setPersonnel(detail.personnel || '');
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

    const [idToDelete, setIdToDelete] = useState<string | null>(null);

    const deleteBon = (id: string) => {
        setIdToDelete(id);
    };

    const confirmDelete = async () => {
        if (!idToDelete) return;
        try {
            await apiService.deleteBonSortie(idToDelete);
            showSuccess('Bon supprimé');
            setIdToDelete(null);
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
        const list = (products as Product[]).slice().sort((a, b) => a.name.localeCompare(b.name));
        return list;
    }, [products]);

    if (!isAdmin) {
        return (
            <div className="p-6">
                <div className="card-3s p-10 flex flex-col items-center text-center max-w-2xl mx-auto border-t-4 border-t-3s-red">
                    <ShieldCheck className="w-16 h-16 text-3s-red opacity-20 mb-4" />
                    <h2 className="text-2xl font-black text-3s-black uppercase tracking-tight">Accès réservé</h2>
                    <p className="text-3s-gray-medium mt-2 font-inter">Seuls les administrateurs peuvent créer des bons de sortie.</p>
                </div>
            </div>
        );
    }

    if (printBon && settings) {
        return <BonSortiePrint bon={printBon} settings={settings} onClose={() => setPrintBon(null)} />;
    }

    return (
        <div className="p-6 space-y-8 bg-3s-gray-light min-h-full font-inter">
            {/* Header & Stats */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div>
                    <h1 className="text-2xl font-bold text-3s-black">Bons de Sortie</h1>
                    <p className="text-3s-gray-medium mt-1">Gérez l'expédition des produits finis vers vos chantiers.</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="card-3s px-6 py-3 flex flex-col justify-center border-l-4 border-l-3s-blue">
                        <span className="text-[10px] text-3s-gray-medium uppercase font-black tracking-widest">Total Émis</span>
                        <span className="text-xl font-black text-3s-black">{bons.length}</span>
                    </div>
                    <div className="card-3s px-6 py-3 flex flex-col justify-center border-l-4 border-l-green-500">
                        <span className="text-[10px] text-3s-gray-medium uppercase font-black tracking-widest">Ce mois</span>
                        <span className="text-xl font-black text-3s-black">
                            {bons.filter(b => new Date(b.createdAt).getMonth() === new Date().getMonth()).length}
                        </span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 items-start relative">
                {/* Creation Form - Fixed/Sticky */}
                <div className="xl:col-span-2 space-y-6 xl:sticky xl:top-8">
                    <div className="card-3s p-8 bg-white shadow-3s border-t-4 border-t-3s-blue relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50/50 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform"></div>

                        <div className="relative">
                            <div className="flex items-center justify-between mb-8">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-blue-100 rounded-xl">
                                        <FileText className="w-6 h-6 text-3s-blue" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-black uppercase tracking-tight text-3s-black">
                                            {editingId ? "Modification de Bon" : "Nouveau Bon de Sortie"}
                                        </h2>
                                        <p className="text-[10px] text-3s-gray-medium font-bold uppercase tracking-widest">Opération de déstockage assemblé</p>
                                    </div>
                                </div>
                                {editingId && (
                                    <button
                                        onClick={() => {
                                            setEditingId(null);
                                            setDraftItems([]);
                                            setSelectedClientId('');
                                            setSelectedChantierId('');
                                            setPersonnel('');
                                        }}
                                        className="btn-3s-secondary px-4 py-2 text-xs flex items-center gap-2"
                                    >
                                        <X className="w-4 h-4" />
                                        Annuler modification
                                    </button>
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-8 border-b border-gray-100">
                                <div>
                                    <label className="block text-xs font-black text-3s-gray-medium uppercase tracking-widest mb-3">Sélection Client *</label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <select
                                            value={selectedClientId}
                                            onChange={(e) => {
                                                setSelectedClientId(e.target.value);
                                                setSelectedChantierId('');
                                            }}
                                            className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-3s-blue outline-none transition-all font-bold text-sm"
                                        >
                                            <option value="">— Choisir un client —</option>
                                            {clients.map((c) => <option key={c.id} value={c.id}>{c.companyName}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-black text-3s-gray-medium uppercase tracking-widest mb-3">Site / Chantier *</label>
                                    <div className="relative">
                                        <Layout className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <select
                                            value={selectedChantierId}
                                            onChange={(e) => setSelectedChantierId(e.target.value)}
                                            className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-3s-blue outline-none transition-all font-bold text-sm"
                                        >
                                            <option value="">— Choisir un site —</option>
                                            {availableChantiers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-black text-3s-gray-medium uppercase tracking-widest mb-3">Personnel</label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <input
                                            type="text"
                                            value={personnel}
                                            onChange={(e) => setPersonnel(e.target.value)}
                                            placeholder="Nom du personnel"
                                            className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-3s-blue outline-none transition-all font-bold text-sm"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="pt-8 space-y-6">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Package className="w-5 h-5 text-3s-blue" />
                                        <h3 className="font-black text-sm uppercase tracking-tight text-3s-black">Sélection des Produits</h3>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                                    <div className="md:col-span-2">
                                        <select
                                            value={productToAdd}
                                            onChange={(e) => {
                                                const pid = e.target.value;
                                                if (!pid) return;
                                                setProductToAdd(pid);
                                                addItem(pid);
                                            }}
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-3s-blue outline-none transition-all text-sm"
                                        >
                                            <option value="">— Ajouter un produit assemblé —</option>
                                            {productsForSelect.map((p) => (
                                                <option key={p.id} value={p.id} disabled={(p.quantity || 0) <= 0}>
                                                    {p.name} (Dispo: {p.quantity})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="flex gap-4 md:col-span-2">
                                        <input
                                            type="number"
                                            min={1}
                                            placeholder="Quantité"
                                            value={qtyToAdd}
                                            onChange={(e) => setQtyToAdd(parseInt(e.target.value || '1', 10))}
                                            className="w-24 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-3s-blue outline-none transition-all text-center font-bold"
                                        />
                                        <button
                                            onClick={() => addItem()}
                                            disabled={!productToAdd || qtyToAdd <= 0}
                                            className="btn-3s-primary flex-1 flex items-center justify-center gap-2 shadow-sm"
                                        >
                                            <Plus className="w-5 h-5" />
                                            Ajouter au bon
                                        </button>
                                    </div>
                                </div>

                                <div className="mt-4">
                                    {draftItems.length === 0 ? (
                                        <div className="bg-gray-50 border border-dashed border-gray-200 rounded-2xl py-8 flex flex-col items-center justify-center">
                                            <Package className="w-10 h-10 text-gray-200 mb-2" />
                                            <p className="text-xs text-3s-gray-medium font-bold uppercase">Aucun item dans la liste</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
                                            {draftItems.map((it) => {
                                                const p = productsById.get(it.productId);
                                                return (
                                                    <div key={it.productId} className="flex items-center gap-4 bg-white border border-gray-100 p-4 rounded-xl shadow-sm hover:border-3s-blue/30 transition-colors">
                                                        <div className="p-2 bg-blue-50 rounded-lg shrink-0">
                                                            <CheckCircle2 className="w-4 h-4 text-3s-blue" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <h4 className="font-bold text-sm text-3s-black truncate leading-tight">{p?.name || it.productId}</h4>
                                                            <p className="text-[10px] text-3s-gray-medium font-mono uppercase mt-0.5">REF: {p?.productNumber || it.productId}</p>
                                                        </div>
                                                        <div className="flex items-center gap-4">
                                                            <div className="flex flex-col items-end">
                                                                <span className="text-[9px] font-black text-3s-gray-medium uppercase">Quantité</span>
                                                                <input
                                                                    type="number"
                                                                    min={1}
                                                                    value={it.quantity}
                                                                    onChange={(e) => updateDraftQty(it.productId, parseInt(e.target.value || '1', 10))}
                                                                    className="w-16 text-right font-black text-3s-black text-sm outline-none"
                                                                />
                                                            </div>
                                                            <button onClick={() => removeItem(it.productId)} className="p-2 text-gray-400 hover:text-3s-red hover:bg-red-50 rounded-lg">
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center justify-between pt-6 border-t border-gray-50 mt-8">
                                    <div className="flex items-center gap-2 text-xs font-bold text-3s-gray-medium uppercase">
                                        <AlertCircle className="w-4 h-4 text-orange-500" />
                                        Vérifiez les items avant émission
                                    </div>
                                    <button
                                        onClick={createBon}
                                        disabled={creating || draftItems.length === 0}
                                        className={`btn-3s-primary px-10 py-3 shadow-3s flex items-center gap-3 ${editingId ? '!bg-orange-600 hover:!bg-orange-700' : '!bg-green-600 hover:!bg-green-700'
                                            }`}
                                    >
                                        <ArrowRight className="w-5 h-5" />
                                        <span>{creating ? 'Traitement...' : editingId ? 'Mettre à jour le bon' : 'Émettre & Imprimer le Bon'}</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* History list - Scrollable Sidebar */}
                <div className="space-y-6 xl:sticky xl:top-8 xl:h-[calc(100vh-12rem)] flex flex-col">
                    <div className="flex items-center gap-3">
                        <History className="w-5 h-5 text-3s-blue" />
                        <h2 className="text-lg font-bold text-3s-black">Historique récent</h2>
                    </div>

                    <div className="card-3s p-3 bg-white/80 backdrop-blur-md border border-gray-100 flex flex-col gap-3 shrink-0">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Rechercher..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-3s-blue transition-all"
                            />
                        </div>
                        <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="date"
                                value={searchDate}
                                onChange={(e) => setSearchDate(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-3s-blue transition-all"
                            />
                        </div>
                        {(searchTerm || searchDate) && (
                            <button onClick={() => { setSearchTerm(''); setSearchDate(''); }} className="text-[10px] font-black uppercase text-3s-blue text-center hover:underline">
                                Réinitialiser les filtres
                            </button>
                        )}
                    </div>

                    <div className="space-y-4 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                        {filteredBons.length === 0 ? (
                            <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-200">
                                <FileText className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                                <p className="text-[10px] font-black uppercase text-3s-gray-medium">Aucun bon trouvé</p>
                            </div>
                        ) : (
                            filteredBons.map((b) => (
                                <div key={b.id} className="card-3s p-4 group hover:border-3s-blue/50 transition-all">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex flex-col">
                                            <span className="text-[9px] font-black text-3s-blue uppercase tracking-tighter">N° {b.id}</span>
                                            <span className="text-[10px] font-bold text-3s-gray-medium mt-0.5">{new Date(b.createdAt).toLocaleDateString('fr-FR')}</span>
                                        </div>
                                        <div className="flex gap-1">
                                            <button onClick={() => openPrint(b.id)} className="p-1.5 text-gray-400 hover:text-black hover:bg-gray-100 rounded-lg transition-colors" title="Imprimer">
                                                <Printer className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => editBon(b.id)} className="p-1.5 text-gray-400 hover:text-3s-blue hover:bg-blue-50 rounded-lg transition-colors" title="Modifier">
                                                <Edit className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => deleteBon(b.id)} className="p-1.5 text-gray-400 hover:text-3s-red hover:bg-red-50 rounded-lg transition-colors" title="Supprimer">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2 text-xs font-bold text-3s-black">
                                            <User className="w-3.5 h-3.5 text-3s-gray-medium" />
                                            <span className="truncate">{b.clientCompanyName}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-[11px] text-3s-gray-medium">
                                            <Layout className="w-3.5 h-3.5 opacity-50" />
                                            <span className="truncate">{b.chantierName}</span>
                                        </div>
                                        {b.personnel && (
                                            <div className="flex items-center gap-2 text-[11px] text-3s-blue font-bold">
                                                <User className="w-3.5 h-3.5 opacity-70" />
                                                <span className="truncate">{b.personnel}</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="mt-4 pt-3 border-t border-gray-50 flex justify-between items-center">
                                        <span className="text-[9px] font-black uppercase px-2 py-0.5 bg-green-50 text-green-600 rounded-full border border-green-100">Expédié</span>
                                        <div className="flex items-center gap-1.5">
                                            <Package className="w-3.5 h-3.5 text-3s-gray-medium opacity-30" />
                                            <span className="text-[10px] font-bold text-3s-black">Stock Mis à jour</span>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
            {/* Deletion Confirmation Modal */}
            {idToDelete && (
                <div className="fixed inset-0 bg-3s-black/80 backdrop-blur-md flex items-center justify-center z-[100] p-4 animate-fade-in">
                    <div className="bg-white rounded-3xl shadow-3xl max-w-md w-full overflow-hidden border border-red-100 transform animate-scale-in">
                        <div className="bg-red-50 p-8 flex flex-col items-center text-center">
                            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-6 border-4 border-white shadow-sm">
                                <AlertCircle className="w-10 h-10 text-3s-red animate-pulse" />
                            </div>
                            <h2 className="text-2xl font-black text-3s-black uppercase tracking-tight mb-2">Confirmation Critique</h2>
                            <p className="text-3s-gray-medium font-medium leading-relaxed">
                                Êtes-vous sûr de vouloir supprimer le bon <span className="text-3s-red font-black">{idToDelete}</span> ?
                            </p>
                            <div className="mt-4 p-3 bg-white/50 rounded-xl border border-red-200">
                                <p className="text-[11px] font-bold text-red-600 uppercase tracking-widest flex items-center gap-2">
                                    <Package className="w-3.5 h-3.5" />
                                    Le stock sera restauré automatiquement
                                </p>
                            </div>
                        </div>
                        <div className="p-6 bg-gray-50 flex gap-4">
                            <button
                                onClick={() => setIdToDelete(null)}
                                className="flex-1 px-6 py-4 bg-white border-2 border-gray-200 rounded-2xl text-3s-gray-medium font-black uppercase text-xs hover:bg-gray-100 hover:border-gray-300 transition-all active:scale-95 shadow-sm"
                            >
                                Annuler
                            </button>
                            <button
                                onClick={confirmDelete}
                                className="flex-1 px-6 py-4 bg-3s-red text-white rounded-2xl font-black uppercase text-xs hover:bg-red-700 transition-all active:scale-95 shadow-lg shadow-red-200 flex items-center justify-center gap-2"
                            >
                                <Trash2 className="w-4 h-4" />
                                Confirmer
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BonSortiePage;
