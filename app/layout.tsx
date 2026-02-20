import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
// 1. IMPORTAMOS EL CEREBRO DEL CARRITO
import { CartProvider } from "../store/useCart"; 

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: 'American Burger',
  description: 'Las mejores hamburguesas de Catamarca. Pedí online y recibí en tu casa.',
  icons: {
    icon: '/logo.jpg'
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-black text-white`}
      >
        {/* 2. ENVOLVEMOS TODA LA APP CON EL PROVIDER */}
        <CartProvider>
            {children}
        </CartProvider>
      </body>
    </html>
  );
}