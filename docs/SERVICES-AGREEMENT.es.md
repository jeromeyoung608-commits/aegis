<!-- Copyright (c) 2026 Jerome Young (Yang Jie) — SPDX-License-Identifier: Apache-2.0 -->
> English original: docs/SERVICES-AGREEMENT.md
> Translation for convenience only. The English text prevails.
> Traducción a título informativo — en caso de divergencia, prevalece el texto en inglés.

# Aegis — soporte & Servicios Acuerdo

> Plantilla acuerdo. Tener un cualificado UE attorney revisión esto — especially el
> responsabilidad limitaciones — aintes firma. Este documento governs **pagado soporte
> y servicios solo**.

**Proveedor:** Jerome Young (Yang Jie), AEGIS mantenedor.
**Cliente:** ⟨legal entity nombre⟩.
**Effective fecha:** ⟨YYYY-MM-DD⟩.

Este servicios acuerdo ("Acuerdo") es entered en entre el Proveedor y
el Cliente. Esto es accompanied por un Formulario de pedido, cuál forms parte de esto.

## 1. Alcance y relation a el software licencia

1.1 El AEGIS software ("el software") es **abierto source**, licenciado bajo el
**Apache licencia, Versión 2.0** (SPDX `Apache-2.0`). El completo texto es en
`LICENSE`. Nada en este Acuerdo restricts, conditions o re-licences el
Cliente's usar de el software.

1.2 El Cliente puede usar, modify, redistribute y sell el software,
incluyendo commercially, sin paying un licencia fee y sin obtaining
permission. Ningún purchase obligación arises de el software's licencia.

1.3 Este Acuerdo cubre solo el **servicios** el Proveedor ejecuta para el
Cliente: despliegue, integración, endurecimiento revisión, cumplimiento preparación paquetes,
SIEM integración y soporte. El alcance de cada encargo es establecido en el
Formulario de pedido.

1.4 Si el Cliente tiene no firmado un Formulario de pedido, ningún servicios son engaged y
ningún obligación arises bajo este Acuerdo.

## 2. Servicios

2.1 El Proveedor ejecuta el servicios listed en el Formulario de pedido §2 con
reasonable skill y care, en accordance con el aceptación criterios en §4.

2.2 Servicios son proporcionado **remotely por predeterminado**. On-site work requiere un
separado statement de work.

2.3 El Proveedor puede usar subcontractors para non-specialist work (e.g. hosting
o translation), restante responsable para su rendimiento.

2.4 **Cambio control.** Work outside el agreed alcance es quoted separately y
begins solo después escrito aprobación. El Proveedor puede stop work que exceeds el
agreed alcance hasta el cambio es approved.

## 3. Cliente obligaciones

3.1 El Cliente proporciona un technically competent contacto, timely acceso a el
objetivo entorno, y el información y credenciales obligatorio para el
encargo.

3.2 El Cliente es responsable para el legal y contractual base en cuál esto
processes documentos y personal datos. **El Proveedor hace no host Cliente
datos** y hace no proceso documento contenido en el Cliente's behalf.

3.3 El Cliente conserva un copia de seguridad aintes cada encargo paso que modifies
persistent estado.

## 4. Entregables y aceptación

4.1 Cada encargo produces escrito entregables: un despliegue registro, un
hardening-review informe, un cumplimiento preparación paquete (SBOM + evidencia índice),
o un soporte summary — as establecido en el Formulario de pedido.

4.2 El Cliente tiene **10 negocio días** de entrega a accept un deliverable
o give escrito aviso de specific non-conformity. Un deliverable es accepted si
ningún aviso es recibido en que período.

4.3 Si un deliverable hace no conform, el Proveedor re-performs el affected
work dentro un reasonable período. Si esto aún hace no conform, el Cliente's
sole remedy para que deliverable es un proportionate reduction de el fee para
el affected elemento.

4.4 El handover de un despliegue follows
[`docs/DEPLOYMENT-DELIVERY-CHECKLIST.md`](./DEPLOYMENT-DELIVERY-CHECKLIST.md),
cuál ambos partes sign apagado.

## 5. Fees, invoicing y renovación

5.1 Fees son esos en el Formulario de pedido, net de VAT y excluding el taxes,
duties y levies el Cliente debe pay.

5.2 Invoices son emitido as establecido en el Formulario de pedido y son payable dentro 30
días. Late payment más allá de 30 días, después escrito aviso, suspends soporte
servicios. El Proveedor puede invoice para work ya ejecutado.

5.3 **Renovación (§307 BGB — attorney revisión obligatorio).** Donde el Formulario de pedido
selects auto-renewal: el término hace no renew silenciosamente. El Proveedor gives
escrito aviso de el upcoming renovación **60 días** aintes término fin; el
Cliente puede terminate con effect en término fin en **30 days' aviso**. Precio
contiene para el committed término. Cualquiera precio cambio en renovación es limitado a el
cambio en el Alemán CPI (Verbraucherpreisindex) sobre el prior 12 months,
aplicado por un establecido formula, y el Cliente puede terminate en cambio de
accepting esto. Avoid "nosotros puede cambio precios en cualquiera tiempo" redacción — tales un clause
es generally invalid as un unreasonable standard-term disadvantage bajo §307
BGB.

5.4 Expenses son charged en coste donde el Formulario de pedido says así, y son nunca
marketed up.

## 6. soporte y servicio levels

6.1 Respuesta objetivos por severity son esos en el Formulario de pedido §4. Un objetivo es un
respuesta tiempo, no un resolution tiempo, a menos que expressly establecido del contrario.

6.2 soporte cubre el deployed versión de el software y el configurations
entregado bajo este encargo. soporte para tercero componentes es proporcionado
a el alcance el Proveedor puede influence esto; el Cliente permanece responsable
para licensing y soporte de esos componentes bajo su propio términos.

6.3 El Proveedor puede suspend soporte para un sustained seguridad problema en el
Cliente's entorno donde continued operación sería expose el Proveedor's
otros clientes; el Proveedor gives aviso y mitiga donde practicable.

## 7. Confidentiality

7.1 Cada parte conserva el other's non-public información confidential, usa esto
solo para este encargo, y protects esto en al menos a el mismo standard esto
se aplica a su propio confidential información de que tipo.

7.2 El obligación sobrevive terminación para tres years.

7.3 Estos obligaciones do no aplicar a información que es público, independently
developed, lawfully recibido de un third parte, o obligatorio a ser disclosed por
ley (donde el disclosing parte gives prompt aviso donde lawful).

7.4 **Cliente datos procesado durante un despliegue permanece el Cliente's datos.**
El Proveedor hace no host esto y hace no retain copies después el encargo
a menos que agreed en writing.

## 8. Intellectual propiedad y marca

8.1 El software, incluyendo su documentación, permanece licenciado bajo
Apache-2.0. El Proveedor grants ningún additional intellectual-property derechos en
el software más allá de que licencia.

8.2 Entregables producido specifically para el Cliente en el course de un
encargo son proporcionado a el Cliente bajo el Apache-2.0 licencia, a el
alcance ellos contener Proveedor material. El Proveedor puede reuse general
know-how, methods y non-Cliente-specific componentes.

8.3 El Proveedor conserva todos derechos en el AEGIS nombre, logo y el
"Motor Por Jerome Young" atribución mark. El Apache-2.0 licencia grants ningún
marca derechos. El Cliente puede estado factually que un despliegue es "based
en Aegis" o "powered por Aegis", proporcionado el atribución notices obligatorio por
Apache-2.0 son conservado.

8.4 Neither parte puede usar el other's marcas en un way que suggests endorsement.

## 9. Warranties y responsabilidad

9.1 El software y el servicios son proporcionado "AS Es", sin garantíun de cualquiera
tipo, a el maximum alcance permitted por ley.

9.2 El Proveedor warrants que esto será perform el servicios con reasonable
skill y care, y que entregables será materially conform a el
aceptación criterios en §4 para 30 días después entrega.

9.3 A el maximum alcance permitted por ley, el Proveedor es **no liable** para
indirect, incidental, special o consequential damages, o para pérdida de profit,
revenue, datos o negocio interruption, arising de el software o el
servicios.

9.4 El Proveedor's aggregate responsabilidad bajo este Acuerdo es limitado a el
cap establecido en el Formulario de pedido / ejecutado horario para el applicable encargo.

9.5 Nada en este clause límites responsabilidad que no puede ser excluded por
applicable ley (intent, gross negligence, death o personal injury caused por
negligence, producto responsabilidad bajo ProdHaftG, fraud, o el simple-negligence
incumplimiento de un cardinal obligación — el latter limitado a typical foreseeable
pérdida).

## 10. Término y terminación

10.1 Este Acuerdo se ejecuta para el término establecido en el Formulario de pedido y terminates
en completion de el servicios o caducidad de que término.

10.2 Either parte puede terminate para material incumplimiento con un 14-día cure período.
El Proveedor puede suspend servicios para non-payment después escrito aviso y un
14-día cure período.

10.3 En terminación el Proveedor entrega el work en progress y el
entregables producido, y el Cliente pays para servicios ejecutado up a que
fecha.

10.4 Terminación hace no affect el Cliente's derechos bajo el Apache-2.0
licencia a el software, nor §§7 (confidentiality), 9 (responsabilidad) o 11
(aplicable ley).

## 11. Aplicable ley y disputes

11.1 Este Acuerdo es governed por el laws de el Federal Republic de Germany,
excluding su conflict-of-laws reglas y el UN CISG.

11.2 El courts de el Proveedor's registrado puesto tener exclusive jurisdiction,
a menos que obligatorio local consumer o datos-protection ley proporciona del contrario.

11.3 El partes será attempt a resolve cualquiera dispute por good-faith negotiation
dentro 30 días de escrito aviso de el dispute, aintes commencing proceedings.

## 12. General

12.1 Este Acuerdo y su Formulario de pedido son el entire acuerdo entre el
partes en su subject matter y supersede earlier discussions.

12.2 Amendments debe ser en writing y firmado por ambos partes.

12.3 Si un provision es unenforceable, esto es modificado a el minimum alcance
necessary; el resto permanece en force.

12.4 Neither parte puede assign este Acuerdo sin el other's prior escrito
consent, except a un successor en un negocio transferencia de substantially todos
activos.

12.5 El Proveedor puede referencia el Cliente as un referencia Cliente, con el
Cliente's escrito aprobación de el redacción, a menos que el Cliente objects.

## 13. Firmas

| | Proveedor | Cliente |
|---|---|---|
| Nombre | Jerome Young (Yang Jie) | ⟨nombre⟩ |
| Title | mantenedor | ⟨title⟩ |
| firma | | |
| Fecha | | |

---

*Este es un commercial-structure plantilla, no legal advice. Tener un cualificado
German/EU attorney revisión esto aintes firma.*
