import React, { useEffect, useMemo, useState } from 'react';
import { Building2, Plus, Edit, Trash2, Mail, Phone, MapPin, Search, ExternalLink, ShieldCheck, UserCheck, Briefcase } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { apiService } from '../../services/api';
import type { Client } from '../../types';

const ClientsList = () => {
  const { user } = useAuth();
  const { showSuccess, showError } = useToast();
  const isAdmin = user?.role === 'admin';

  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [form, setForm] = useState({
    companyName: '',
    matriculeFiscal: '',
    address: '',
    phone: '',
    email: ''
  });

  const load = async () => {
    setLoading(true);
    try {
      const data = await apiService.getClients();
      setClients(data);
    } catch (e) {
      showError('Erreur', 'Impossible de charger les clients');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    return clients
      .filter(c =>
        c.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.matriculeFiscal?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.email?.toLowerCase().includes(searchQuery.toLowerCase())
      )
      .sort((a, b) => a.companyName.localeCompare(b.companyName));
  }, [clients, searchQuery]);

  const openCreate = () => {
    if (!isAdmin) return;
    setEditing(null);
    setForm({ companyName: '', matriculeFiscal: '', address: '', phone: '', email: '' });
    setShowModal(true);
  };

  const openEdit = (c: Client) => {
    if (!isAdmin) return;
    setEditing(c);
    setForm({
      companyName: c.companyName || '',
      matriculeFiscal: c.matriculeFiscal || '',
      address: c.address || '',
      phone: c.phone || '',
      email: c.email || ''
    });
    setShowModal(true);
  };

  const close = () => {
    setShowModal(false);
    setEditing(null);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    if (!form.companyName.trim()) {
      showError('Erreur', 'Nom de l’entreprise requis');
      return;
    }
    try {
      if (editing) {
        const updated = await apiService.updateClient(editing.id, form);
        setClients((prev) => prev.map((c) => (c.id === editing.id ? updated : c)));
        showSuccess('Client mis à jour', `${updated.companyName}`);
      } else {
        const created = await apiService.createClient(form);
        setClients((prev) => [...prev, created]);
        showSuccess('Client créé', `${created.companyName}`);
      }
      close();
    } catch (err) {
      showError('Erreur', err instanceof Error ? err.message : 'Action impossible');
    }
  };

  const remove = async (c: Client) => {
    if (!isAdmin) return;
    if (!window.confirm(`Supprimer le client "${c.companyName}" ?`)) return;
    try {
      await apiService.deleteClient(c.id);
      setClients((prev) => prev.filter((x) => x.id !== c.id));
      showSuccess('Client supprimé', c.companyName);
    } catch (err) {
      showError('Erreur', err instanceof Error ? err.message : 'Suppression impossible');
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  if (!isAdmin) {
    return (
      <div className="p-6">
        <div className="card-3s p-10 flex flex-col items-center text-center max-w-2xl mx-auto border-t-4 border-t-3s-red">
          <ShieldCheck className="w-16 h-16 text-3s-red opacity-20 mb-4" />
          <h2 className="text-2xl font-black text-3s-black uppercase tracking-tight">Accès réservé</h2>
          <p className="text-3s-gray-medium mt-2 font-inter">Seuls les administrateurs peuvent gérer le répertoire des clients.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8 bg-3s-gray-light min-h-full font-inter">
      {/* Header & Stats */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl font-bold text-3s-black">Répertoire Clients</h1>
          <p className="text-3s-gray-medium mt-1">Gérez votre base de clients et leurs informations fiscales.</p>
        </div>

        <div className="flex items-center gap-4">
          <div className="card-3s px-6 py-3 flex flex-col justify-center border-l-4 border-l-green-500">
            <span className="text-[10px] text-3s-gray-medium uppercase font-black tracking-widest">Total Clients</span>
            <span className="text-xl font-black text-3s-black">{clients.length}</span>
          </div>
          <button
            onClick={openCreate}
            className="btn-3s-primary px-6 py-3 flex items-center gap-2 shadow-3s"
          >
            <Plus className="w-5 h-5" />
            <span>Nouveau Client</span>
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="card-3s p-3 bg-white/80 backdrop-blur-md border border-gray-100">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher par nom, M.F ou email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-3s-blue outline-none transition-all shadow-sm"
          />
        </div>
      </div>

      {/* Grid Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-20 gap-4">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-3s-blue border-t-transparent shadow-sm"></div>
          <p className="text-3s-gray-medium font-bold animate-pulse text-sm">CHARGEMENT DES CLIENTS...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-dashed border-gray-300">
          <Building2 className="w-16 h-16 text-gray-200 mb-4" />
          <h3 className="text-lg font-semibold text-3s-black">Répertoire vide</h3>
          <p className="text-3s-gray-medium">Aucun client ne correspond à votre recherche.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
          {filtered.map((c) => (
            <div key={c.id} className="card-3s group hover:scale-[1.02] transform transition-all cursor-default overflow-hidden flex flex-col">
              {/* Card Header */}
              <div className="p-4 flex gap-4 bg-gradient-to-br from-gray-50 to-white border-b border-gray-100">
                <div className="w-14 h-14 bg-green-50 rounded-xl flex items-center justify-center border border-green-100 uppercase">
                  <span className="text-xl font-black text-green-600">{getInitials(c.companyName)}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-3s-black truncate leading-tight group-hover:text-3s-blue transition-colors">{c.companyName}</h3>
                  <div className="mt-1 flex flex-col gap-0.5">
                    <span className="text-[10px] text-3s-gray-medium font-mono uppercase tracking-tighter">ID: {c.id}</span>
                    {c.matriculeFiscal && (
                      <span className="text-[10px] text-3s-blue font-black uppercase tracking-tight flex items-center gap-1">
                        <UserCheck className="w-3 h-3" />
                        M.F: {c.matriculeFiscal}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <button onClick={() => openEdit(c)} className="p-1.5 text-gray-400 hover:text-3s-blue hover:bg-blue-50 rounded-lg transition-all" title="Modifier">
                    <Edit className="w-4 h-4" />
                  </button>
                  <button onClick={() => remove(c)} className="p-1.5 text-gray-400 hover:text-3s-red hover:bg-red-50 rounded-lg transition-all" title="Supprimer">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Contact Information */}
              <div className="p-5 space-y-4 flex-1">
                <div className="space-y-3">
                  {c.email && (
                    <a href={`mailto:${c.email}`} className="flex items-center gap-3 text-xs text-3s-gray-medium hover:text-3s-blue transition-colors group/link p-2 -mx-2 rounded-lg hover:bg-blue-50/50">
                      <div className="p-1.5 bg-white shadow-sm border border-gray-100 rounded-md">
                        <Mail className="w-3.5 h-3.5" />
                      </div>
                      <span className="truncate flex-1">{c.email}</span>
                      <ExternalLink className="w-3 h-3 opacity-0 group-hover/link:opacity-100" />
                    </a>
                  )}

                  {c.phone && (
                    <a href={`tel:${c.phone}`} className="flex items-center gap-3 text-xs text-3s-gray-medium hover:text-3s-blue transition-colors group/link p-2 -mx-2 rounded-lg hover:bg-blue-50/50">
                      <div className="p-1.5 bg-white shadow-sm border border-gray-100 rounded-md">
                        <Phone className="w-3.5 h-3.5" />
                      </div>
                      <span className="truncate flex-1">{c.phone}</span>
                      <ExternalLink className="w-3 h-3 opacity-0 group-hover/link:opacity-100" />
                    </a>
                  )}
                </div>

                {c.address && (
                  <div className="pt-4 border-t border-gray-50">
                    <div className="flex items-start gap-3">
                      <div className="p-1.5 bg-gray-50 rounded-md shrink-0">
                        <MapPin className="w-3.5 h-3.5 text-3s-gray-medium" />
                      </div>
                      <p className="text-[11px] text-3s-gray-medium leading-relaxed italic line-clamp-2">
                        {c.address}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer Meta */}
              <div className="px-5 py-3 bg-gray-50/50 border-t border-gray-50 flex justify-between items-center mt-auto">
                <span className="text-[9px] font-black text-3s-gray-medium/60 uppercase tracking-tighter">Client Privilégié</span>
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                  <span className="text-[10px] font-bold text-3s-black uppercase">Enregistré</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modernized Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-3s-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-gray-100 transform animate-scale-in">
            <div className="bg-gradient-to-r from-green-600 to-green-700 p-6 flex items-center justify-between text-white">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/20 rounded-xl">
                  {editing ? <Edit className="w-6 h-6" /> : <Building2 className="w-6 h-6" />}
                </div>
                <div>
                  <h2 className="text-xl font-black uppercase tracking-tight">
                    {editing ? 'Modifier Client' : 'Nouveau Client'}
                  </h2>
                  <p className="text-white/60 text-xs font-bold">Fichier Client StockSpider</p>
                </div>
              </div>
              <button onClick={close} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <Plus className="w-6 h-6 rotate-45" />
              </button>
            </div>

            <form onSubmit={submit} className="p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-xs font-black text-3s-gray-medium uppercase tracking-widest mb-2">Dénomination Sociale *</label>
                  <input
                    type="text"
                    required
                    value={form.companyName}
                    onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none transition-all shadow-sm"
                    placeholder="Nom complet de l'entreprise"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-black text-3s-gray-medium uppercase tracking-widest mb-2">Matricule Fiscal (M.F)</label>
                  <div className="relative">
                    <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={form.matriculeFiscal}
                      onChange={(e) => setForm({ ...form, matriculeFiscal: e.target.value })}
                      className="w-full pl-9 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none transition-all shadow-sm font-mono text-sm"
                      placeholder="1234567/A/B/C/000"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black text-3s-gray-medium uppercase tracking-widest mb-2">Téléphone</label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none transition-all shadow-sm"
                    placeholder="Numéro de contact"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-3s-gray-medium uppercase tracking-widest mb-2">Email Facturation</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none transition-all shadow-sm"
                    placeholder="finance@client.com"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-black text-3s-gray-medium uppercase tracking-widest mb-2">Adresse de livraison / Siège</label>
                  <textarea
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    rows={2}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none transition-all shadow-sm resize-none"
                    placeholder="Adresse complète"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t border-gray-50">
                <button type="button" onClick={close} className="btn-3s-secondary px-8 shadow-sm">
                  Annuler
                </button>
                <button type="submit" className="btn-3s-primary px-8 shadow-3s !bg-green-600 hover:!bg-green-700">
                  {editing ? 'Mettre à jour' : 'Enregistrer le client'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientsList;


