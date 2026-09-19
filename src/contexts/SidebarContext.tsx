"use client";

import { createContext, useContext, useState, ReactNode } from "react";

interface SidebarContextType {
  isOpen: boolean;
  open: () => void;
  close: () => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

// Estado do drawer mobile do Sidebar, compartilhado entre o botão que
// abre o menu (vive no Navbar, dentro do fluxo normal do header) e o
// próprio <Sidebar />. Antes o botão ficava fixed/position absoluto
// fora do header, com um top calculado "na mão" que nunca acompanhava
// de verdade a altura real do header — daí o desalinhamento visual.
// Botão e header agora dividem o mesmo container flex, então o
// alinhamento vem "de graça" do próprio layout.
export function SidebarProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <SidebarContext.Provider
      value={{
        isOpen,
        open: () => setIsOpen(true),
        close: () => setIsOpen(false),
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (context === undefined) {
    throw new Error("useSidebar deve ser usado dentro de um SidebarProvider");
  }
  return context;
}
