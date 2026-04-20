import familyJson from "./family.json";
import type { FamilyData } from "../types/family";

const familyData = familyJson as unknown as FamilyData;

export default familyData;
