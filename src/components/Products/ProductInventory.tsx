import { useState } from 'react';
import { Box, Search, Package, AlertTriangle, Edit2, Wrench } from 'lucide-react';
import { useData } from '../../hooks/useData';
import { formatPrice } from '../../utils/priceFormatter';
import ProductModal from './ProductModal';

const ProductInventory = () => {
    const { products, addProductToAssembly } = useData();
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedProduct, setSelectedProduct] = useState<any>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.productNumber.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleEdit = (product: any) => {
        setSelectedProduct(product);
        setIsModalOpen(true);
    };

    const handleAssemble = async (product: any) => {
        // Par défaut, ajouter 1 à l'assemblage
        await addProductToAssembly(product.id, 1);
    };

    return (
        <div className="p-6 space-y-8 bg-3s-gray-light min-h-full font-inter">
            {/* Premium Header & Search */}
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
                <div className="flex-1 space-y-6">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-3s-blue/10 rounded-2xl shadow-inner">
                            <Box className="w-6 h-6 text-3s-blue" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-3s-black uppercase tracking-tight leading-none">Produits Finis</h1>
                            <p className="text-[10px] text-3s-gray-medium font-bold uppercase tracking-widest mt-2 opacity-70">Inventaire Global & Catalogue 3S IT</p>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-4 items-center bg-white p-5 rounded-[2rem] shadow-sm border border-gray-100/50">
                        <div className="relative flex-1 min-w-[300px]">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-3s-gray-medium opacity-50" />
                            <input
                                type="text"
                                placeholder="Rechercher par nom, référence ou SKU..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-3s-blue outline-none transition-all font-bold text-sm text-3s-black placeholder:text-gray-400"
                            />
                        </div>
                        <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-xl border border-gray-100">
                            <span className="text-[10px] font-black text-3s-gray-medium uppercase tracking-widest">Total:</span>
                            <span className="text-sm font-black text-3s-blue">{filteredProducts.length}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Products Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                {filteredProducts.map((product) => {
                    const isOutOfStock = product.quantity <= 0;
                    const isLowStock = product.quantity <= 2 && product.quantity > 0;

                    return (
                        <div
                            key={product.id}
                            className="group relative bg-white rounded-[2.5rem] shadow-sm hover:shadow-2xl transition-all duration-500 border border-gray-100 overflow-hidden flex flex-col"
                        >
                            {/* Visual Background Decoration */}
                            <div className={`absolute top-0 right-0 w-32 h-32 rounded-full -mr-16 -mt-16 opacity-[0.03] group-hover:scale-150 transition-transform duration-700 ${isOutOfStock ? 'bg-3s-red' : isLowStock ? 'bg-orange-500' : 'bg-3s-blue'}`}></div>

                            {/* Image Workspace */}
                            <div className="relative aspect-square m-2 rounded-[2rem] bg-gray-50/50 border border-gray-100/50 flex items-center justify-center overflow-hidden group-hover:bg-white transition-colors duration-500">
                                {product.imageUrl ? (
                                    <img
                                        src={product.imageUrl}
                                        alt={product.name}
                                        className="w-full h-full object-contain p-4 transition-all duration-700 group-hover:scale-110"
                                    />
                                ) : (
                                    <div className="flex flex-col items-center gap-3 opacity-20 group-hover:opacity-40 transition-opacity">
                                        <Package className="w-16 h-16 text-3s-blue" />
                                        <span className="text-[8px] uppercase tracking-[0.2em] font-black">Archive Image</span>
                                    </div>
                                )}

                                {/* Status Floating Badge */}
                                <div className={`absolute top-4 right-4 px-3 py-1.5 rounded-xl text-[10px] font-black shadow-lg backdrop-blur-md border animate-in fade-in zoom-in duration-500 ${isOutOfStock
                                        ? 'bg-red-500/90 text-white border-red-400/30'
                                        : isLowStock
                                            ? 'bg-orange-500/90 text-white border-orange-400/30'
                                            : 'bg-white/90 text-3s-blue border-white/50'
                                    }`}>
                                    {isOutOfStock ? 'ÉPUISÉ' : isLowStock ? 'LOW STOCK' : `STOCK: ${product.quantity}`}
                                </div>

                                {/* Modern Glass Overlay Actions */}
                                <div className="absolute inset-0 bg-3s-black/60 opacity-0 group-hover:opacity-100 transition-all duration-500 backdrop-blur-[2px] flex items-center justify-center gap-4 translate-y-4 group-hover:translate-y-0">
                                    <button
                                        onClick={() => handleEdit(product)}
                                        className="p-4 bg-white text-3s-blue rounded-2xl hover:bg-3s-blue hover:text-white transition-all shadow-2xl hover:scale-110 active:scale-95"
                                        title="Paramètres Produit"
                                    >
                                        <Edit2 className="w-5 h-5" />
                                    </button>
                                    <button
                                        onClick={() => handleAssemble(product)}
                                        className="p-4 bg-white text-green-600 rounded-2xl hover:bg-green-600 hover:text-white transition-all shadow-2xl hover:scale-110 active:scale-95"
                                        title="Lancer l'assemblage"
                                    >
                                        <Wrench className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>

                            {/* Content Deck */}
                            <div className="p-6 flex-1 flex flex-col">
                                <div className="mb-4">
                                    <h3 className="font-black text-lg text-3s-black group-hover:text-3s-blue transition-colors uppercase tracking-tight leading-tight line-clamp-1">
                                        {product.name}
                                    </h3>
                                    <div className="flex items-center gap-2 mt-2">
                                        <span className="text-[10px] font-mono font-bold text-3s-gray-medium bg-gray-50 px-2 py-0.5 rounded border border-gray-100 uppercase tracking-tighter">
                                            {product.productNumber || 'NO-REF'}
                                        </span>
                                    </div>
                                </div>

                                <div className="mt-auto space-y-5">
                                    {/* Répartition des 5 états de production */}
                                    {(() => {
                                        const states = [
                                            { label: 'PCB', value: product.pcbRemaining || 0, color: 'text-gray-600 bg-gray-50 border-gray-100' },
                                            { label: 'Cours', value: product.inProgress || 0, color: 'text-amber-600 bg-amber-50 border-amber-100' },
                                            { label: 'Assemblé', value: product.assembledFinished || 0, color: 'text-blue-600 bg-blue-50 border-blue-100' },
                                            { label: 'Vendu', value: product.sold || 0, color: 'text-green-600 bg-green-50 border-green-100' },
                                            { label: 'Panne', value: product.defective || 0, color: 'text-red-600 bg-red-50 border-red-100' },
                                        ];
                                        const total = states.reduce((s, x) => s + x.value, 0);
                                        if (total === 0) return null;
                                        return (
                                            <div className="border-t border-gray-50 pt-4">
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-[8px] font-black text-3s-gray-medium uppercase tracking-[0.1em]">Production</span>
                                                    <span className="text-[10px] font-bold text-3s-black font-mono">{total} u.</span>
                                                </div>
                                                <div className="grid grid-cols-5 gap-1">
                                                    {states.map((s) => (
                                                        <div key={s.label} className={`text-center px-1 py-1.5 rounded-lg border ${s.color}`}>
                                                            <span className="block text-sm font-black font-mono leading-none">{s.value}</span>
                                                            <span className="block text-[7px] font-bold uppercase tracking-tight mt-0.5">{s.label}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })()}

                                    <div className="flex items-end justify-between border-t border-gray-50 pt-4">
                                        <div>
                                            <span className="block text-[8px] font-black text-3s-gray-medium uppercase tracking-[0.1em] mb-1">Prix Catalogue</span>
                                            <span className="text-xl font-black text-3s-black font-mono leading-none">{formatPrice(product.sellingPrice)}</span>
                                        </div>
                                        <div className="text-right">
                                            <span className="block text-[8px] font-black text-3s-gray-medium uppercase tracking-[0.1em] mb-1">Bill of Mat.</span>
                                            <span className="text-xs font-bold text-3s-blue bg-3s-blue/5 px-2 py-1 rounded-lg border border-3s-blue/10">{product.components?.length || 0} ITEMS</span>
                                        </div>
                                    </div>

                                    {isLowStock && (
                                        <div className="flex items-center gap-2 text-[10px] font-black text-red-600 bg-red-50/50 p-2.5 rounded-xl border border-red-100/50 shadow-inner">
                                            <AlertTriangle className="w-3.5 h-3.5 animate-pulse" />
                                            <span className="uppercase tracking-widest">Alerte Réapprovisionnement</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Empty State Deck */}
            {filteredProducts.length === 0 && (
                <div className="flex flex-col items-center justify-center py-32 bg-white/50 rounded-[4rem] border-2 border-dashed border-gray-100 shadow-inner">
                    <div className="p-8 bg-white rounded-full shadow-lg mb-8 border border-gray-50">
                        <Package className="w-20 h-20 text-gray-200" />
                    </div>
                    <h3 className="text-2xl font-black text-3s-black uppercase tracking-tight">Catalogue vide</h3>
                    <p className="text-sm font-bold text-3s-gray-medium max-w-sm text-center mt-3 leading-relaxed opacity-60">Aucun produit ne correspond à votre recherche. Vérifiez les filtres ou créez une nouvelle fiche produit.</p>
                </div>
            )}

            {isModalOpen && (
                <ProductModal
                    isOpen={isModalOpen}
                    onClose={() => {
                        setIsModalOpen(false);
                        setSelectedProduct(null);
                    }}
                    product={selectedProduct}
                />
            )}
        </div>
    );
};

export default ProductInventory;
