import { lazy, Suspense, type ReactNode } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

const Dashboard = lazy(() => import("./pages/Dashboard"));
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const OrdersPage = lazy(() => import("./pages/Orders"));
const CustomersPage = lazy(() => import("./pages/Customers"));
const ServicesPage = lazy(() => import("./pages/Services"));
const ReportsPage = lazy(() => import("./pages/Reports"));
const ExpensesPage = lazy(() => import("./pages/Expenses"));
const SettingsPage = lazy(() => import("./pages/Settings"));
const StaffPage = lazy(() => import("./pages/Staff"));
const ProductsPage = lazy(() => import("./pages/Products"));
const ExpenseHeadsPage = lazy(() => import("./pages/ExpenseHeads"));
const AdditionalChargesPage = lazy(() => import("./pages/AdditionalCharges"));
const StorageBagsPage = lazy(() => import("./pages/StorageBags"));
const StorageRacksPage = lazy(() => import("./pages/StorageRacks"));
const PriceListsPage = lazy(() => import("./pages/PriceLists"));
const CreatePriceListPage = lazy(() => import("./pages/CreatePriceList"));
const PosOrderPage = lazy(() => import("./pages/PosOrder"));
const DeliveryOrdersPage = lazy(() => import("./pages/DeliveryOrders"));
const InvoicesPage = lazy(() => import("./pages/Invoices"));
const CollectionPage = lazy(() => import("./pages/Collection"));
const PaymentReceivedPage = lazy(() => import("./pages/PaymentReceived"));
const MultiExpensePage = lazy(() => import("./pages/MultiExpense"));
const AnalyticalDashboardPage = lazy(() => import("./pages/AnalyticalDashboard"));
const YearlyDashboardPage = lazy(() => import("./pages/YearlyDashboard"));

function ProtectedRoute({ children }: { children: ReactNode }) {
  const token = localStorage.getItem("token");

  if (!token) {
    return <Navigate to="/" replace />;
  }

  return children;
}

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<div style={{ padding: 24 }}>Loading...</div>}>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/orders"
            element={
              <ProtectedRoute>
                <OrdersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/customers"
            element={
              <ProtectedRoute>
                <CustomersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/services"
            element={
              <ProtectedRoute>
                <ServicesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports"
            element={
              <ProtectedRoute>
                <ReportsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/expenses"
            element={
              <ProtectedRoute>
                <ExpensesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <SettingsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/staff"
            element={
              <ProtectedRoute>
                <StaffPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/products"
            element={
              <ProtectedRoute>
                <ProductsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/expense-heads"
            element={
              <ProtectedRoute>
                <ExpenseHeadsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/additional-charges"
            element={
              <ProtectedRoute>
                <AdditionalChargesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/storage-bags"
            element={
              <ProtectedRoute>
                <StorageBagsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/storage-racks"
            element={
              <ProtectedRoute>
                <StorageRacksPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/price-lists"
            element={
              <ProtectedRoute>
                <PriceListsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/create-price-list"
            element={
              <ProtectedRoute>
                <CreatePriceListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/pos"
            element={
              <ProtectedRoute>
                <PosOrderPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/delivery-orders"
            element={
              <ProtectedRoute>
                <DeliveryOrdersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/invoices"
            element={
              <ProtectedRoute>
                <InvoicesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/collection"
            element={
              <ProtectedRoute>
                <CollectionPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/payments"
            element={
              <ProtectedRoute>
                <PaymentReceivedPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/multi-expense"
            element={
              <ProtectedRoute>
                <MultiExpensePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/analytical-dashboard"
            element={
              <ProtectedRoute>
                <AnalyticalDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/yearly-dashboard"
            element={
              <ProtectedRoute>
                <YearlyDashboardPage />
              </ProtectedRoute>
            }
          />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
