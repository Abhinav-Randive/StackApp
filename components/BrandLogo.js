import React from "react";
import {
  Image,
  Platform,
  View
} from "react-native";
import LogoSvg from "../logo1.svg";

export default function BrandLogo({
  width = 168,
  height = 76,
  style
}) {
  if (Platform.OS === "web") {
    return (
      <View style={style}>
        <Image
          source={require("../assets/logo.png")}
          style={{ width, height, resizeMode: "contain" }}
        />
      </View>
    );
  }

  return <LogoSvg width={width} height={height} style={style} />;
}
