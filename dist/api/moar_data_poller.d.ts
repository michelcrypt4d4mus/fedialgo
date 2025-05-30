import { ComponentLogger } from '../helpers/log_helpers';
export declare const GET_MOAR_DATA = "getMoarData()";
export declare const MOAR_DATA_PREFIX = "[getMoarData()]";
export declare const moarDataLogger: ComponentLogger;
export declare function getMoarData(): Promise<boolean>;
