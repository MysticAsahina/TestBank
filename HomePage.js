import { View, Text, Button, TextInput, TouchableOpacity } from "react-native";
import styles from "./styles";
import React, { useState } from "react";
import { LinearGradient } from "expo-linear-gradient";


export default function HomePage({ navigation }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  return (
    <LinearGradient
      colors={["#00416a", "#00506aff", "#ffe000"]}
      start={{ x: 0, y: 1 }}
      end={{ x: 1, y: 0 }}
      style={styles.container}
    >
      <View style={styles.LoginContainer}>
        
        <Text style={styles.title}>Login</Text>
        <TextInput
          style={styles.input}
          placeholder="Username/ID"
          value={username}
          onChangeText={setUsername}
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
        <TouchableOpacity 
          style={styles.LoginButton} 
          onPress={() => navigation.navigate("TemporaryPage")}
        >
          <Text style={styles.LoginButtonText}>Login</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.RegisterButton} 
          onPress={() => navigation.navigate("RegisterAccountPage")}
        >
          <Text style={styles.LoginButtonText}>Register Account</Text>
        </TouchableOpacity>
      
      </View>

      
    </LinearGradient>
  );
}
