<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: docs/compliance/PRIVACY-POLICY.md
> Translation for convenience only. The English text prevails.
> Traducción a título informativo — en caso de divergencia, prevalece el texto en inglés.

# Aegis Privacidad Política

**Estado:** Emitido para firma · **Versión:** 1.0 · **Último actualizado:** 2026-11-14
**Producto:** Aegis — Privacidad primero Local datos Limpieza Motor
**Se aplica a:** el autoalojado Aegis software y su operadores (el "Servicio").

---

## 1. Quién es el responsable del tratamiento?

Aegis es un **local-first** producto. En el standard despliegue el software se ejecuta
entirely en infrastructure usted control (su servidor, su machines). El
**Cliente** quién operates un Aegis instancia es el **datos responsable del tratamiento** para el
personal datos procesado a través de esto; el Aegis software acts as el **encargado del tratamiento**
en el Cliente's behalf. Cuando Aegis es operated por su vendor as un managed
servicio, el vendor es el responsable del tratamiento y un separado responsable del tratamiento aviso se aplica.

Este política explica qué el *software* processes y cómo esto es configurado a
honour datos-protection obligaciones. Esto es no un substitute para el Cliente's propio
privacidad aviso donde el Cliente determines el purposes de procesamiento.

## 2. Qué datos es procesado

| datos | Donde esto vive | Notas |
|------|---------------|-------|
| Documentos / media subido para limpieza | Cliente's tiempo de ejecución volumen, entonces un **encrypted-archive bóveda** | Nunca deja el instancia a menos que expresamente exportado. |
| Derivado calcula le hash / manifests | Mismo tiempo de ejecución volumen | Content-hash solo; original bytes son no re-transmitted. |
| operador & emisor cuentas | SQLite almacén (`accounts`) | Hashed credenciales; ningún texto sin cifrar passwords. |
| auditoríun eventos | SQLite almacén (`audit_events`, encadenado por hash) | Operator/system eventos son **resistente a la manipulación y append-only** (véase §6). |
| Opcional RFC3161 timestamps | Enviado a un Cliente-configured TSA | Solo un **hash** es transmitted, nunca documento bytes (opt-in, predeterminado apagado). |

Aegis hace **no** phone home, hace no embed tercero analytics, y envía
con **cero red salida** por predeterminado.

## 3. Legal bases (GDPR Art. 6)

- **Contrato (Art. 6(1)(b))** — operating el Servicio usted requested.
- **Legitimate interests (Art. 6(1)(f))** — seguridad, fraud prevention, y
  maintaining el integridad de el rastro de auditoríun.
- **Consent (Art. 6(1)(un))** — cualquiera opcional integración (e.g. externo TSA) es
  opt-in y apagado por predeterminado.

## 4. datos minimisation & conocimiento cero

Identidad proofs (e.g. el integrado conocimiento cero identidad módulo) son diseñado
a **demostrar attributes sin revealing ellos**. Personal datos es procesado solo
a el alcance obligatorio para el requested operación y es no usado para secondary
purposes.

## 5. International transferencias

Por predeterminado allí son **ningún international transferencias** — procesamiento es local. Si un
Cliente permite el opcional RFC3161 marca de tiempo adaptador, un **hash** (no
personal datos en claro) puede ser enviado a un TSA endpoint el Cliente configures;
appropriate transferencia mechanisms (SCC) son el Cliente's responsabilidad.

## 6. Retención & borrado

- **datos interesados** (salas, firmantes, fin individuals) puede exercise el derecho a
  borrado (GDPR Art. 17). El Servicio implementa borrado vía su datos-subject
  borrado function, cuál deletes el subject's personal-datos rows mientras
  retaining un redacción marker para responsabilidad.
- **operador / sistema auditoríun eventos** form un **resistente a la manipulación, append-only**
  responsabilidad registro y son **no erasable** — erasing el operador's propio trail
  es refused (HTTP 403). Este es un deliberate forensic-integrity control, no un
  limitation de el borrado derecho: esto se aplica solo a el seguridad rastro de auditoríun,
  nunca a datos-subject registros.

## 7. seguridad

- Cifrado en resto para el bóveda; encadenado por hash auditoríun registro.
- Hashed credenciales; bearer-token operador auth con TTL.
- Inicio de sesión throttling (por IP y por IP:username) a resist brute force y
  enumeration.
- Ningún externo salida sin explícito opt-in.

## 8. Su derechos

Acceso, rectification, borrado, restriction, portability, y objection
(GDPR Arts. 15–21). Exercise ellos a través de el instancia operador; para un
vendor-managed instancia, contacto el DPO abajo.

## 9. Contacto & DPO

**datos Protection Officer:** {{DPO_Nombre}} — `{{DPO_EMAIL}}` ({{DPO_Dirección}}). autoridad de control:
{{SUPERVISORY_AUTHORITY}}. Para vendor-managed instances el DPO es el
punto de contacto para el derechos abajo.

## 10. Retención horario

| datos | Predeterminado retención | Disparador / legal base |
|------|------------------|----------------------|
| operador / emisor cuentas | 30 días después deactivation, entonces deleted | responsable del tratamiento política; un redacción marker solo es conservado |
| bóveda / encrypted-archive contents | hasta el operador deletes ellos | local volumen; ningún automatic caducidad |
| auditoríun eventos (operator/system) | 365 días rolling, entonces pruned | resistente a la manipulación forensic-integrity registro; **no erasable** (véase §6) |
| Sesión tokens | TTL-bound (≤ 1 hora); auto-expire | seguridad |
| Documentos / media | eliminado cuando el operador deletes ellos | local procesamiento |

## 11. Responding a su solicitudes (GDPR Art. 12(3))

Nosotros acknowledge solicitudes sin undue delay y provide el substantive
información **dentro uno mes** de receipt (extendable por two further months para
complex solicitudes, con aviso). Solicitudes puede ser submitted a el DPO (§9).
Acknowledgement plantilla:

> **Subject:** Confirmation de receipt — datos-protection solicitud (Aegis)
> Thank usted para su solicitud recibido en {fecha}. Nosotros acknowledge esto bajo
> GDPR Art. 12(3) y será respond substantively dentro uno mes. Si nosotros necesitar a
> verificar su identidad o extend el deadline, nosotros será contacto usted.

## 12. Cookies & local almacenamiento

Aegis conjuntos **ningún HTTP cookies** (verificado: cero `Set-Cookie` en cualquiera respuesta). El
operador consola almacena strictly-necessary estado solo en el navegador's
`sessionStorage` — e.g. `sessionStorage['aegis.issuer']` (operador sesión token),
el selected pestaña, y in-progress form estado. Estos son no tracking cookies,
son no compartido con cualquiera third parte, y son cleared cuando el sesión ends.
Porque ningún tracking o non-essential cookies son usado, ningún cookie-consent banner
es obligatorio; este sección documentos el position transparently.

## 13. Deutsche Fassung (Zusammenfassung)

Diese Datenschutzerklärung gilt für morir lokale Aegis-software. Der betreibende
Kunde ist en der Regel morir verantwortliche Stelle (responsable del tratamiento); Aegis ist
Auftragsverarbeiter. Es erfolgt **keine Datenübertragung ins Ausland** ohne
ausdrückliche Opción (z. B. optionaler RFC3161-TSA, nur hash, kein Dokument).
Betroffene haben morir Rechte nach Art. 15–21 DSGVO. Eine vollständige
deutschsprachige Fassung ist vor Veröffentlichung durch morir zuständige Stelle
bereitzustellen und rechtlich prüfen zu lassen.

> Este documento es un plantilla. Reemplaza placeholders, confirmar el controller/processor
> posture para su despliegue, y tener esto reviewed por cualificado asesoría jurídica aintes usar.
