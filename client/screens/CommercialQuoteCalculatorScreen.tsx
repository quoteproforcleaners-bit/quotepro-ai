import React from "react";
import { useRoute } from "@react-navigation/native";
import CommercialQuoteScreen from "@/features/commercial/screens/CommercialQuoteScreen";
import { ProGate } from "@/components/ProGate";

export default function CommercialQuoteCalculatorScreen() {
  const route = useRoute();
  const params = (route.params as any) || {};

  return (
    <ProGate featureName="Commercial Quote Builder" minTier="pro">
      <CommercialQuoteScreen
        customerName={params.customerName}
        customerAddress={params.customerAddress}
      />
    </ProGate>
  );
}
