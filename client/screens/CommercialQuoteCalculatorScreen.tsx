import React from "react";
import { useRoute } from "@react-navigation/native";
import CommercialQuoteScreen from "@/features/commercial/screens/CommercialQuoteScreen";

export default function CommercialQuoteCalculatorScreen() {
  const route = useRoute();
  const params = (route.params as any) || {};

  return (
    <CommercialQuoteScreen
      customerName={params.customerName}
      customerAddress={params.customerAddress}
    />
  );
}
