import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppHeader } from './components/layout/AppHeader';
import { AppFooter } from './components/layout/AppFooter';
import { AppSidebar } from './components/layout/AppSidebar';
import { SlotRenderer } from './components/rendering/SlotRenderer';

export function App() {
  return (
    <BrowserRouter>
      <div>
        <AppHeader />
        <div style={{ display: 'flex' }}>
          <AppSidebar />
          <main>
            <Routes>
              <Route path="/" element={
                <SlotRenderer component="SlotDemo" props={{ label: "Main Content Area" }} />
              } />
              <Route path="/galyashop/*" element={
                <SlotRenderer component="SlotDemo" props={{ label: "GalyaShop" }} />
              } />
              <Route path="/mydate/*" element={
                <SlotRenderer component="SlotDemo" props={{ label: "MyDate" }} />
              } />
              <Route path="/ttt/*" element={
                <SlotRenderer component="SlotDemo" props={{ label: "TTT" }} />
              } />
            </Routes>
          </main>
        </div>
        <AppFooter />
      </div>
    </BrowserRouter>
  );
}
