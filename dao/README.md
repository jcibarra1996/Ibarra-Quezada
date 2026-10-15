# DAO

DAO on-chain sobre Ethereum (o cualquier red EVM) construida con los
contratos de gobernanza de OpenZeppelin 5.6. Es la base técnica: token de
votos, reglas de votación y una tesorería que solo se mueve por votación.

## Cómo funciona

| Contrato | Qué hace |
| --- | --- |
| `DAOToken` | Token ERC20 de suministro fijo. Un token = un voto, pero solo cuenta si el titular lo delega (a sí mismo o a otra persona). |
| `TimelockController` | La tesorería y el "brazo" de la DAO. Tiene los fondos y ejecuta lo aprobado, siempre con un retraso. |
| `DAOGovernor` | Recibe propuestas, cuenta votos (a favor, en contra, abstención) y, si se aprueban, las manda al timelock. |

Ciclo de una propuesta:

1. **Proponer.** Cualquiera con votos suficientes (`proposalThreshold`) propone una o varias acciones (pagar, cambiar una regla, llamar a otro contrato).
2. **Espera** (`votingDelay`). Al final se toma la foto de quién tiene cuántos votos. Tokens que se muevan después no cuentan para esa propuesta.
3. **Votación** (`votingPeriod`). Se aprueba si hay más votos a favor que en contra y si votó al menos el `quorumPercent` del suministro (a favor y abstenciones cuentan para el quórum).
4. **Encolar** en el timelock.
5. **Retraso** (`timelockDelay`). Da tiempo a quien no esté de acuerdo para salir antes de que se ejecute.
6. **Ejecutar.** Cualquiera puede dispararla.

Al desplegar, el script le quita al deployer todo control: solo el governor
puede proponer o cancelar en el timelock, y las reglas de la DAO solo cambian
por votación.

Los plazos van en **segundos** (el token usa reloj por timestamp, no por
bloque), así que valen igual en mainnet, en L2 o en una red de prueba.

## Uso

```bash
cd dao
npm install
npm test            # corre las pruebas
```

### Configurar

Edita `dao.config.js`: nombre y símbolo del token, reparto inicial, plazos,
quórum y umbral para proponer. Valores por defecto: 1 día de espera, 7 días de
votación, quórum de 4 %, 2 días de timelock, 1,000,000 de tokens para quien
despliega.

### Desplegar en local

```bash
npm run node                # terminal 1: nodo local
npm run deploy:local        # terminal 2
```

### Desplegar en Sepolia (red de prueba)

```bash
export RPC_URL="https://..."       # de Alchemy, Infura, etc.
export PRIVATE_KEY="0x..."         # una cuenta de prueba con ETH de Sepolia
npm run deploy:sepolia
```

Nunca guardes la llave privada en el repo. Usa una cuenta exclusiva para
desplegar.

Después del despliegue, cada titular tiene que llamar a `delegate(suDirección)`
en el token para activar sus votos. Para votar sin programar se puede conectar
el governor a una interfaz como Tally.

## Antes de mainnet

- Las piezas son contratos estándar de OpenZeppelin, pero esta combinación
  concreta no está auditada. Con fondos reales, conviene una auditoría.
- Hay que fijar los parámetros reales. Un quórum muy bajo deja que pocos
  decidan; uno muy alto puede paralizar la DAO.
- Esto es solo la capa técnica. No le da a la DAO personalidad jurídica ni
  resuelve temas fiscales o regulatorios.

## Extensiones posibles

- Membresía por NFT (ERC721Votes) en vez de token fungible.
- `GovernorPreventLateQuorum`, para que nadie gane una votación con un voto masivo en el último minuto.
- Acuñación controlada por la DAO, en vez de suministro fijo.
- Votación off-chain con Snapshot y una multifirma Safe, si se prefiere no pagar gas por cada voto.
