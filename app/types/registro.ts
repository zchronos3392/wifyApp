export type RegistroCabecera = {
  fecha: string;
  horaInicio: string;
  correlativo: number;
  lugar1: string;
  lugar2: string;
  lugar3: string;
  lugar4: string;
  horaFin: string | null;
};

export type RegistroDetalle = {
  correlativoDetalle: number;
  fecha: string;
  horaInicioRegistro: string;
  correlativoCabecera: number;
  capturedAt: string;
  lat: number | null;
  lng: number | null;
  accuracyM: number | null;
  wifiRssiDbm: number | null;
};

export type CabeceraForm = {
  lugar1: string;
  lugar2: string;
  lugar3: string;
  lugar4: string;
};
