    /**
     *
  ===========================================================================
  ===
     * MÓDULO ANTI-SSRF: servidor/validar-url.server.ts
     *
  ===========================================================================
  ===
     *
     * Protege o servidor contra ataques SSRF (Server-Side Request Forgery),
     * onde um invasor tenta fazer o servidor acessar recursos internos da
  rede
     * (ex: localhost, painel do roteador, metadados da nuvem AWS/GCP).
     *
     * Use esta função SEMPRE antes de fazer qualquer fetch() com URL vinda
  do usuário.
     *
     * Bloqueia:
     *  ❌ Protocolos não-HTTP (file://, ftp://, etc.)
     *  ❌ Endereços de loopback     (127.0.0.0/8, ::1)
     *  ❌ Redes privadas LAN        (10.x, 172.16-31.x, 192.168.x)
     *  ❌ Link-local                (169.254.x.x — metadados de nuvem
  AWS/GCP)
     *  ❌ Rede interna IPv6         (fc00::/7)
     *
  ===========================================================================
  ===
     */

import { createConnection } from "node:net";
import { lookup}from "node:dns/promises";

 // Faixas de IP privadas/internas bloqueadas (formato CIDR simplificado)
 const BLOCOS_PRIVADOS: [number, number, number][] = [
    // [primeiro octeto, segundo octeto (ou -1 para qualquer), máscara de bits relevantes]
    [127,  -1, 8],   // 127.0.0.0/8    — Loopback (localhost)
      [10,   -1, 8],   // 10.0.0.0/8     — Rede privada classe A
      [172,  -1, 8],   // 172.16-31.x    — Rede privada classe B (checagem extra bauxi)
  
      [192, 168, 16],  // 192.168.0.0/16 — Rede privada classe C
      [169, 254, 16],  // 169.254.0.0/16 — Link-local (metadados AWS/GCP: 169.254.169.254)
  
      [0,    -1, 8],   // 0.0.0.0/8      — Rede "this"
      [100,  64, 10],  // 100.64.0.0/10  — CGNAT (RFC 6598)
      [198,  18, 15],  // 198.18.0.0/15  — Benchmarking (RFC 2544)
    ];
    /**
     * ipEhPrivado(ip)
     * Retorna true se o IP pertencer a uma faixa interna/privada bloqueada.
     */