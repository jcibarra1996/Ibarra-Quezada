// Parámetros de la DAO. Edita aquí antes de desplegar.
// Todos los plazos van en segundos (el token usa reloj por timestamp).

const DAY = 24 * 60 * 60;

module.exports = {
  tokenName: "Mi DAO",
  tokenSymbol: "MDAO",
  governorName: "Mi DAO Governor",

  // Reparto inicial del token. El suministro es fijo: no se puede acuñar más después.
  // Si queda vacío, todo el suministro va a la cuenta que despliega.
  // Cantidades en unidades enteras de token (se convierten a 18 decimales).
  initialDistribution: [
    // { address: "0x...", amount: 1_000_000 },
  ],
  defaultSupply: 1_000_000,

  votingDelay: 1 * DAY, // tiempo entre que se propone y que abre la votación
  votingPeriod: 7 * DAY, // duración de la votación
  proposalThreshold: 0, // votos mínimos para poder proponer (en unidades enteras de token)
  quorumPercent: 4, // % del suministro que debe votar (a favor + abstención) para que valga
  timelockDelay: 2 * DAY, // espera entre aprobar y ejecutar, para que quien no esté de acuerdo pueda salir
};
