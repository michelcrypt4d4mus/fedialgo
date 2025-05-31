import { Logger } from '../helpers/logger';
export declare const GET_MOAR_DATA = "getMoarData()";
export declare const MOAR_DATA_PREFIX = "[getMoarData()]";
export declare const moarDataLogger: Logger;
export declare function getMoarData(): Promise<boolean>;
