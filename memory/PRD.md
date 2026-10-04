# EDS PIXEL — Hub Gestionale Quantum

## Problem Statement
SaaS gestionale per laboratorio riparazioni "EDS PIXEL di Emilio De Leo" (P.IVA 08976891211, Cupa Fossa del Lupo 142 - Napoli). Tema scuro Quantum (#0b132b/#0f172a). React + FastAPI + MongoDB. JWT auth. Formato IT / EUR.

## Architecture
- Backend: FastAPI + Motor (MongoDB), JWT Bearer (`eds_token` localStorage), bcrypt, admin seed on startup
- Frontend: React + Tailwind + shadcn, qrcode.react, lucide-react, sonner toasts
- Public endpoints: `/api/public/track/{code}`, `/api/public/settings`

## User Personas
- **Amministratore** (Emilio): accesso completo (impostazioni, operatori, spese, elimina pratiche)
- **Tecnico**: operativo (ticket, cassa) — niente impostazioni/eliminazione

## Core Requirements (static)
- Multi-tenant store settings (anagrafica, garanzia, target giornaliero)
- Ticket flow: in_registro → in_lavorazione → pronto → consegnato (+ non_riparabile)
- Stampe isolate: A4 split verticale (Copia Cliente+Laboratorio), etichetta termica 58mm con QR
- WhatsApp wa.me integration (nessuna API esterna)
- POS Cassa con accessori preferiti preconfigurati
- Portalino tracking pubblico via `?track=CODE` o `/track/:code`

## What's Been Implemented — 02 Oct 2026 (MVP)
- Auth JWT (admin perpixel14@gmail.com / admin123, tecnico tecnico@edspixel.it / tecnico123)
- Dashboard KPI + Denaro Fermo + Piano Riscatto + Consigli business
- Registro Tickets con quick actions (WhatsApp, avanzamento, stampa A4, stampa etichetta, modifica, elimina)
- Nuova Pratica wizard con PIN auto-generato
- Cassa POS Touch con 8 accessori preferiti + articolo libero + 3 metodi pagamento
- Schede Clienti aggregate (per telefono) con storico e statistiche
- Report giornaliero con split POS/riparazioni + consigli pratici dinamici
- Impostazioni (anagrafica, garanzia, spese fisse multi-periodo, gestione operatori)
- Portalino tracking live con timeline progressiva
- Layout responsive mobile/tablet con drawer navigation

## Testing — 100%
- iteration_2: tutti i test backend + frontend passati

## Backlog (P1)
- Agenda appuntamenti + Google Calendar sync
- Fatturazione elettronica (export XML SDI)
- AI preventivo diagnostico da guasto segnalato (Claude Sonnet)
- Firma digitale on-screen su tablet per scheda cliente
- Export CSV/PDF dei report mensili

## Backlog (P2)
- Multi-sede / multi-tenant real
- Magazzino componenti con alert sottoscorta
- Statistiche advanced con chart (recharts)
- Push notifications al cliente sui cambi stato
