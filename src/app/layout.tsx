import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Toaster, ToastBar, toast } from "react-hot-toast";
import { AppearanceProvider } from "@/components/AppearanceProvider";

export const viewport: Viewport = {
  themeColor: "#000000",
};

export const metadata: Metadata = {
  title: "H2 MilkTea",
  description: "Hệ thống quản lý thông minh",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "H2 MilkTea",
  },
  other: {
    "apple-mobile-web-app-capable": "yes",
    "mobile-web-app-capable": "yes",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover"
        />
        {/* Google Fonts cho tùy chọn cài đặt font hệ thống */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&family=Inter:wght@300;400;500;600;700&family=Lexend:wght@300;400;500;600;700&family=Roboto:wght@300;400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased min-h-screen text-gray-900 bg-gray-50">
        <AppearanceProvider />
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3500,
            style: {
              background: '#fff',
              color: '#1f2937',
              border: '1px solid #e5e7eb',
              borderRadius: '0.75rem',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
              padding: '8px 12px',
            },
            success: {
              iconTheme: {
                primary: '#10b981',
                secondary: '#fff',
              },
            },
            error: {
              iconTheme: {
                primary: '#ef4444',
                secondary: '#fff',
              },
            },
          }}
        >
          {(t) => (
            <ToastBar toast={t}>
              {({ icon, message }) => (
                <div className="flex items-center gap-2.5 w-full">
                  {icon}
                  <div className="flex-1 text-sm font-medium">{message}</div>
                  {t.type !== 'loading' && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toast.dismiss(t.id);
                      }}
                      className="ml-2 inline-flex items-center justify-center w-6 h-6 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors focus:outline-none"
                      title="Đóng nhanh"
                      aria-label="Đóng thông báo"
                    >
                      <span className="text-sm font-bold leading-none">✕</span>
                    </button>
                  )}
                </div>
              )}
            </ToastBar>
          )}
        </Toaster>
      </body>
    </html>
  );
}
