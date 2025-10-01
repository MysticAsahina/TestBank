import React, { useState } from "react";
import { View, Text, TextInput, Button, Alert } from "react-native";
import styles from "./styles";
import { Picker } from "@react-native-picker/picker";

export default function UserForm({ navigation }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [firstname, setFirstName] = useState("");
  const [middlename, setMiddleName] = useState("");
  const [lastname, setLastName] = useState("");
  const [employeeNumber, setEmployeeNumber] = useState("");
  const [department, setDepartment] = useState("");
  const [position, setPosition] = useState("");

  const handleSave = async () => {
    if (!username || !password || !confirmPassword) {
      Alert.alert("Error", "Please fill in all required fields");
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match");
      return;
    }

    try {
      const response = await fetch("http://10.0.2.2:7000/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          password,
          firstname,
          middlename,
          lastname,
          employeeNumber,
          department,
          position,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert("Success", "Professor registered successfully");
        navigation.goBack();
      } else {
        Alert.alert("Error", data.error || "Failed to register professor");
      }
    } catch (error) {
      Alert.alert("Error", error.message || "Something went wrong");
    }
  };

  const handleCancel = () => {
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <View style={styles.LoginContainer}>
        <Text style={styles.title}>Professor's Registration</Text>

        <View style={styles.AccountInfo}>
          <Text style={styles.subtitle}>Account Information</Text>
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
          <TextInput
            style={styles.input}
            placeholder="Confirm Password"
            secureTextEntry
            value={confirmPassword}
            onChangeText={setConfirmPassword}
          />
        </View>

        <View style={styles.PersonalInfo}>
          <Text style={styles.subtitle}>Personal Information</Text>
          <TextInput
            style={styles.input}
            placeholder="First Name"
            value={firstname}
            onChangeText={setFirstName}
          />
          <TextInput
            style={styles.input}
            placeholder="Middle Name"
            value={middlename}
            onChangeText={setMiddleName}
          />
          <TextInput
            style={styles.input}
            placeholder="Last Name"
            value={lastname}
            onChangeText={setLastName}
          />
        </View>

        <View style={styles.ProfessionalInfo}>
          <Text style={styles.subtitle}>Professional Information</Text>
          <TextInput
            style={styles.input}
            placeholder="Employee Number"
            value={employeeNumber}
            onChangeText={setEmployeeNumber}
          />
          <View style={styles.SelectContainer}>
            <Text style={styles.label}>Department</Text>
            <View style={styles.dropdownContainer}>
              <Picker
                selectedValue={department}
                onValueChange={(itemValue) => setDepartment(itemValue)}
                style={styles.dropdown}
              >
                <Picker.Item label="Select Department" value="" />
                <Picker.Item label="Computer Studies" value="CS" />
                <Picker.Item label="Business Administration" value="BA" />
                <Picker.Item label="Education" value="EDUC" />
                <Picker.Item label="Accountancy" value="ACC" />
              </Picker>
            </View>
          </View>

          <View style={styles.SelectContainer}>
            <Text style={styles.label}>Position</Text>
            <View style={styles.dropdownContainer}>
              <Picker
                selectedValue={position}
                onValueChange={(itemValue) => setPosition(itemValue)}
                style={styles.dropdown}
              >
                <Picker.Item label="Select Position" value="" />
                <Picker.Item label="Instructor" value="Instructor" />
                <Picker.Item label="Assistant Professor" value="Assistant Professor" />
                <Picker.Item label="Associate Professor" value="Associate Professor" />
                <Picker.Item label="Professor" value="Professor" />
              </Picker>
            </View>
          </View>
        </View>

        <View style={styles.buttonContainer}>
          <Button title="Save" onPress={handleSave} />
          <Button title="Cancel" onPress={handleCancel} color="red" />
        </View>
      </View>
    </View>
  );
}
