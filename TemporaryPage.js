import { View, Text, Button, TextInput, TouchableOpacity } from "react-native";
import styles from "./styles";
import React, { useState } from "react";
import { LinearGradient } from "expo-linear-gradient";


export default function TemporaryPage({ navigation }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  return (
    <LinearGradient
      colors={["#00416a", "#00506aff", "#ffe000"]}
      start={{ x: 0, y: 1 }}
      end={{ x: 1, y: 0 }}
      style={styles.container}
    >
      <View style={styles.TemporaryContainer}>
        
        <Text style={styles.title}>Temporary Page</Text>

        <TouchableOpacity
            style={styles.Button}
            onPress={() => navigation.navigate("ProfPage")}
        >
            <Text style={styles.ProfButtonText}>Prof Page</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.Button} 
          onPress={() => navigation.navigate("StudentPage")}
        >
          <Text style={styles.StudentButtonText}>Student Account</Text>
        </TouchableOpacity>
      </View>

      
    </LinearGradient>
  );
}
