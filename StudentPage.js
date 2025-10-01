import React from "react";
import { View, Text, Button } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import styles from "./styles";


const Tab = createBottomTabNavigator();

function Dashboard() {
  return (
    <View style={styles.container}>
      <Text>Professor Dashboard</Text>
    </View>
  );
}

function ManageTest() {
  return (
    <View style={styles.container}>
      <Text>Manage Test Page</Text>
    </View>
  );
}

function Reports() {
  return (
    <View style={styles.container}>
      <Text>Reports Page</Text>
    </View>
  );
}

function Profile({ navigation }) {
  return (
    <View style={styles.container}>
      <Text>Profile Page</Text>
      <Button
              title="Exit"
              onPress={() => navigation.navigate("Home")}
            />
    </View>
    
  );
}

export default function ProfPage() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false, // hides the top bar
        tabBarStyle: { height: 60 },
        tabBarLabelStyle: { fontSize: 14, marginBottom: 5 },
      }}
    >
      <Tab.Screen name="Dashboard" component={Dashboard} />
      <Tab.Screen name="Manage Test" component={ManageTest} />
      <Tab.Screen name="Reports" component={Reports} />
      <Tab.Screen name="Profile" component={Profile} />
    </Tab.Navigator>
  );
}


