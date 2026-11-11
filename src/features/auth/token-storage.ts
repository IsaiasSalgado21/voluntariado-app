import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

const TOKEN_KEY = "regenera-auth-token";
let webToken: string | null = null;

export async function readAuthToken(): Promise<string | null> {
  if (Platform.OS === "web") return webToken;
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function saveAuthToken(token: string): Promise<void> {
  if (Platform.OS === "web") {
    webToken = token;
    return;
  }
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function removeAuthToken(): Promise<void> {
  if (Platform.OS === "web") {
    webToken = null;
    return;
  }
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}
