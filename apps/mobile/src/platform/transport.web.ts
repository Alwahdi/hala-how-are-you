import { PilotError } from "../core/types";
export const nativeAvailable = () => false;
export const connectLive = async (..._args: unknown[]): Promise<never> => {
  throw new PilotError("unsupported");
};
