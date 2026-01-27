import React, { useState, useMemo } from 'react';
import { Truck, Plus, Edit, Trash2, Mail, Phone, MapPin, Search, User, ExternalLink, Building2 } from 'lucide-react';
import { useData } from '../../hooks/useData';
import { useToast } from '../../hooks/useToast';

interface Supplier {
  id: string;
  name: string;
  contact: string;
  email: string;
  phone: string;
  address: string;
  createdAt: string;
}

const SuppliersList = () => {
  const { suppliers, addSupplier, updateSupplier, deleteSupplier } = useData();
  const { showSuccess, showError } = useToast();
  const [showModal, setShowModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    contact: '',
    email: '',
    phone: '',
    address: ''
  });

  const filteredSuppliers = useMemo(() => {
    return suppliers.filter(s =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.contact?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [suppliers, searchQuery]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      showError('Erreur', 'Le nom du fournisseur est requis');
      return;
    }

    try {
      if (editingSupplier) {
        await updateSupplier(editingSupplier.id, formData);
        showSuccess('Fournisseur mis à jour', `${formData.name} a été mis à jour`);
      } else {
        await addSupplier(formData);
        showSuccess('Fournisseur ajouté', `${formData.name} a été ajouté`);
      }
      resetForm();
    } catch (error) {
      showError('Erreur', 'Une erreur est survenue');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      contact: '',
      email: '',
      phone: '',
      address: ''
    });
    setEditingSupplier(null);
    setShowModal(false);
  };

  const handleEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setFormData({
      name: supplier.name,
      contact: supplier.contact,
      email: supplier.email,
      phone: supplier.phone,
      address: supplier.address
    });
    setShowModal(true);
  };

  const handleDelete = async (supplier: Supplier) => {
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer le fournisseur "${supplier.name}" ?`)) {
      try {
        await deleteSupplier(supplier.id);
        showSuccess('Fournisseur supprimé', `${supplier.name} a été supprimé`);
      } catch (error) {
        showError('Erreur', 'Impossible de supprimer le fournisseur');
      }
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

  return (
    <div className="p-6 space-y-8 bg-3s-gray-light min-h-full font-inter">
      {/* Header & Stats */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl font-bold text-3s-black">Répertoire Fournisseurs</h1>
          <p className="text-3s-gray-medium mt-1">Gérez vos partenaires et leurs coordonnées de contact.</p>
        </div>

        <div className="flex items-center gap-4">
          <div className="card-3s px-6 py-3 flex flex-col justify-center border-l-4 border-l-3s-blue">
            <span className="text-[10px] text-3s-gray-medium uppercase font-black tracking-widest">Total Partenaires</span>
            <span className="text-xl font-black text-3s-black">{suppliers.length}</span>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="btn-3s-primary px-6 py-3 flex items-center gap-2 shadow-3s"
          >
            <Plus className="w-5 h-5" />
            <span>Ajouter</span>
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="card-3s p-3 bg-white/80 backdrop-blur-md border border-gray-100">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher par nom, contact ou email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-3s-blue outline-none transition-all shadow-sm"
          />
        </div>
      </div>

      {/* Grid Content */}
      {filteredSuppliers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-dashed border-gray-300">
          <Truck className="w-16 h-16 text-gray-200 mb-4" />
          <h3 className="text-lg font-semibold text-3s-black">Répertoire vide</h3>
          <p className="text-3s-gray-medium">Aucun fournisseur ne correspond à votre recherche.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
          {filteredSuppliers.map((s) => (
            <div key={s.id} className="card-3s group hover:scale-[1.02] transform transition-all cursor-default overflow-hidden flex flex-col">
              {/* Card Header with Profile Logo */}
              <div className="p-4 flex gap-4 bg-gradient-to-br from-gray-50 to-white border-b border-gray-100">
                <div className="w-14 h-14 bg-3s-blue/10 rounded-xl flex items-center justify-center border border-3s-blue/20">
                  <span className="text-xl font-black text-3s-blue">{getInitials(s.name)}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-3s-black truncate leading-tight group-hover:text-3s-blue transition-colors">{s.name}</h3>
                  <div className="flex items-center gap-1 mt-1 text-[10px] text-3s-gray-medium font-bold uppercase">
                    <User className="w-3 h-3" />
                    <span className="truncate">{s.contact || 'Aucun contact'}</span>
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <button onClick={() => handleEdit(s)} className="p-1.5 text-gray-400 hover:text-3s-blue hover:bg-blue-50 rounded-lg transition-all" title="Modifier">
                    <Edit className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(s)} className="p-1.5 text-gray-400 hover:text-3s-red hover:bg-red-50 rounded-lg transition-all" title="Supprimer">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Contact Information */}
              <div className="p-5 space-y-4 flex-1">
                <div className="space-y-3">
                  <a href={`mailto:${s.email}`} className="flex items-center gap-3 text-xs text-3s-gray-medium hover:text-3s-blue transition-colors group/link p-2 -mx-2 rounded-lg hover:bg-blue-50/50">
                    <div className="p-1.5 bg-white shadow-sm border border-gray-100 rounded-md">
                      <Mail className="w-3.5 h-3.5" />
                    </div>
                    <span className="truncate flex-1">{s.email || 'Email non fourni'}</span>
                    <ExternalLink className="w-3 h-3 opacity-0 group-hover/link:opacity-100" />
                  </a>

                  <a href={`tel:${s.phone}`} className="flex items-center gap-3 text-xs text-3s-gray-medium hover:text-3s-blue transition-colors group/link p-2 -mx-2 rounded-lg hover:bg-blue-50/50">
                    <div className="p-1.5 bg-white shadow-sm border border-gray-100 rounded-md">
                      <Phone className="w-3.5 h-3.5" />
                    </div>
                    <span className="truncate flex-1">{s.phone || 'Tel non fourni'}</span>
                    <ExternalLink className="w-3 h-3 opacity-0 group-hover/link:opacity-100" />
                  </a>
                </div>

                <div className="pt-4 border-t border-gray-50">
                  <div className="flex items-start gap-3">
                    <div className="p-1.5 bg-gray-50 rounded-md shrink-0">
                      <MapPin className="w-3.5 h-3.5 text-3s-gray-medium" />
                    </div>
                    <p className="text-[11px] text-3s-gray-medium leading-relaxed italic line-clamp-2">
                      {s.address || 'Aucune adresse enregistrée'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Footer Meta */}
              <div className="px-5 py-3 bg-gray-50/50 border-t border-gray-50 flex justify-between items-center mt-auto">
                <span className="text-[9px] font-black text-3s-gray-medium/60 uppercase tracking-tighter">Partenaire StockSpider</span>
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 bg-3s-blue rounded-full animate-pulse"></div>
                  <span className="text-[10px] font-bold text-3s-black">Actif</span>
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
            <div className="bg-gradient-to-r from-3s-blue to-3s-blue-dark p-6 flex items-center justify-between text-white">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/20 rounded-xl">
                  {editingSupplier ? <Edit className="w-6 h-6" /> : <Building2 className="w-6 h-6" />}
                </div>
                <div>
                  <h2 className="text-xl font-black uppercase tracking-tight">
                    {editingSupplier ? 'Modifier Partenaire' : 'Nouveau Partenaire'}
                  </h2>
                  <p className="text-white/60 text-xs font-bold">Catalogue Fournisseurs StockSpider</p>
                </div>
              </div>
              <button onClick={resetForm} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <Plus className="w-6 h-6 rotate-45" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-xs font-black text-3s-gray-medium uppercase tracking-widest mb-2">Raison Sociale *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-3s-blue outline-none transition-all shadow-sm"
                    placeholder="Nom officiel de l'entreprise"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-3s-gray-medium uppercase tracking-widest mb-2">Interlocuteur</label>
                  <input
                    type="text"
                    value={formData.contact}
                    onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-3s-blue outline-none transition-all shadow-sm"
                    placeholder="Nom du contact principal"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-3s-gray-medium uppercase tracking-widest mb-2">Téléphone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-3s-blue outline-none transition-all shadow-sm"
                    placeholder="+33 1 23 45 67 89"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-black text-3s-gray-medium uppercase tracking-widest mb-2">Email Professionnel</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-3s-blue outline-none transition-all shadow-sm"
                    placeholder="contact@entreprise.com"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-black text-3s-gray-medium uppercase tracking-widest mb-2">Adresse Siège</label>
                  <textarea
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    rows={2}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-3s-blue outline-none transition-all shadow-sm resize-none"
                    placeholder="Rue, Code Postal, Ville, Pays"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t border-gray-50">
                <button type="button" onClick={resetForm} className="btn-3s-secondary px-8 shadow-sm">
                  Annuler
                </button>
                <button type="submit" className="btn-3s-primary px-8 shadow-3s">
                  {editingSupplier ? 'Mettre à jour' : 'Enregistrer le partenaire'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuppliersList;
