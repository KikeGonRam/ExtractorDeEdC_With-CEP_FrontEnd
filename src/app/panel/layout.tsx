'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  FileDown,
  History as HistoryIcon,
  Menu as MenuIcon,
  X,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';


/* ------------------- Link de navegación ------------------- */
function NavLink({ href, label, icon }: { href: string; label: string; icon: React.ReactNode }) {
  const pathname = usePathname();
  const active = pathname?.startsWith(href);
  return (
    <Link
      href={href}
      className={[
        'group flex items-center gap-3 w-full px-4 py-2 rounded-xl transition-all duration-200',
        active
          ? 'bg-blue-100 text-blue-700 shadow-md'
          : 'text-slate-600 hover:bg-slate-100',
      ].join(' ')}
    >
      <span className={['w-5 h-5', active ? 'text-blue-600' : 'text-slate-400'].join(' ')}>{icon}</span>
      <span className={['text-base font-semibold tracking-wide', active ? 'text-blue-700' : ''].join(' ')}>{label}</span>
    </Link>
  );
}

/* ------------------- Layout panel con sidebar ------------------- */
export default function PanelLayout({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState<boolean>(false);
  const pathname = usePathname(); 

  // Persistir estado (opcional)
  useEffect(() => {
    const saved = localStorage.getItem('panel.sidebar');
    if (saved) setOpen(saved === 'open');
  }, []);
  useEffect(() => {
    localStorage.setItem('panel.sidebar', open ? 'open' : 'closed');
    // bloquear scroll del body cuando está abierto
    document.documentElement.style.overflow = open ? 'hidden' : '';
    return () => { document.documentElement.style.overflow = ''; };
  }, [open]);

  
  // Cerrar con ESC
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // 🔒 Cierra el drawer en cualquier cambio de ruta
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <div className="min-h-[100dvh] w-full bg-gradient-to-b from-[#1159d4] via-[#2b6de6] to-[#3a7af0]">
      {/* Botón flotante (hamburguesa) */}
      {!open && (
        <button
          aria-label="Abrir menú"
          onClick={() => setOpen(true)}
          className="fixed left-4 top-4 z-[60] flex h-12 w-12 items-center justify-center
                     rounded-full shadow-lg text-white
                     bg-gradient-to-br from-blue-500 to-blue-700"
        >
          <MenuIcon className="h-6 w-6" />
        </button>
      )}

      {/* Overlay con blur del fondo */}
      {open && (
        <button
          aria-label="Cerrar menú"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-[70] bg-black/30 backdrop-blur-sm"
        />
      )}

      {/* Drawer lateral “glass” */}
      <aside
        className={[
          'fixed left-0 top-0 bottom-0 z-[80] w-72 px-4 py-7 transition-transform duration-300',
          open ? 'translate-x-0' : '-translate-x-full',
          'bg-white shadow-xl rounded-r-3xl flex flex-col border-r border-blue-100',
        ].join(' ')}
      >
        <div className="mb-8 flex items-center justify-between">
          <div className="text-lg font-bold text-blue-700">Menú</div>
          <button
            aria-label="Cerrar menú"
            onClick={() => setOpen(false)}
            className="p-2 rounded-lg text-blue-700 hover:bg-blue-100 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

  <nav className="space-y-3">
          <NavLink
            href="/panel/extractor"
            label="Extractor"
            icon={<FileDown className="w-5 h-5 text-blue-600" />}
          />
          <NavLink
            href="/panel/historial"
            label="Historial"
            icon={<HistoryIcon className="w-5 h-5 text-blue-600" />}
          />
        </nav>

        <div className="mt-auto pt-8 pb-2 text-xs text-slate-400 text-center">
          © {new Date().getFullYear()} Bechapra
        </div>
      </aside>

      {/* Contenido */}
      <div className="mx-auto max-w-7xl px-4 md:px-6 py-6">
        {children}
      </div>
    </div>
  );
}
