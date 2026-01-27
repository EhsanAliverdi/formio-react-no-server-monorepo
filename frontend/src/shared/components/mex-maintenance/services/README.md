# MEX Maintenance SDK

A portable, UI-agnostic TypeScript SDK for integrating with **MEX Maintenance** APIs.

This SDK mirrors the official MEX REST API and provides:
- Typed DTOs
- Clean service abstractions
- Consistent error handling
- Zero UI assumptions

It is designed to be embedded into:
- Web applications
- Backend services
- Integration layers
- Custom Prestart / Maintenance apps

---

## ✨ Features

- Fully typed (TypeScript)
- One module per MEX domain
- Clean separation of concerns:
  - HTTP
  - Types
  - Services
- No framework dependency
- Portable across projects

---

## 📦 Project Structure

```
src/
├── core/
│   ├── config/        # SDK configuration
│   ├── http/          # HTTP client & errors
│   └── types/         # Shared types & Result pattern
│
├── modules/
│   ├── asset/
│   ├── work-order/
│   ├── supplier/
│   ├── purchase-order/
│   └── ...
│
├── index.ts           # Public SDK entry point
└── README.md
```

---

## 🚀 Installation

This SDK is designed for internal or private distribution.

```bash
npm install @your-org/mex-sdk
```

or via local linking / monorepo usage.

---

## 🔧 Configuration

Create and configure the HTTP client once:

```ts
import { MexHttpClient } from '@your-org/mex-sdk';

const http = new MexHttpClient({
  baseUrl: 'https://your-mex-server:5100',
  apiKey: 'YOUR_API_KEY'
});
```

Authentication strategy depends on your MEX deployment.

---

## 🧠 Usage Example

```ts
import {
  WorkOrderClient,
  WorkOrderService
} from '@your-org/mex-sdk';

const workOrderService = new WorkOrderService(
  new WorkOrderClient(http)
);

const result = await workOrderService.getAll();

if (result.ok) {
  console.log(result.value);
} else {
  console.error(result.error.message);
}
```

---

## 🧱 Architecture Principles

- Thin Clients  
  Clients only translate method calls to HTTP requests.

- Services handle errors  
  All errors are mapped into domain-safe `MexError` objects.

- DTOs mirror MEX API  
  No opinionated transformations.

- No UI coupling  
  Safe for frontend and backend usage.

---

## 🧩 Supported MEX Domains

- Assets
- Work Orders
- Requests
- Requisitions
- Purchase Orders
- Suppliers
- Invoices
- Trades & Spares
- Reference data (Tax, Priority, Job Type, etc.)

(Complete coverage of the exposed MEX API.)

---

## 🛠 Extending the SDK

This SDK is intentionally minimal.

Common extensions:
- Aggregation services
- Custom Prestart workflows
- Sync jobs
- Reporting layers

---

## 📌 License

Internal / proprietary use.

---

## 🧭 Next Steps

Recommended additions:
- Root `MexClient` facade
- Auth strategy abstraction
- Retry / circuit breaker
- Prestart domain built on top of Work Orders

---

This SDK is production-ready and safe for reuse across projects.
