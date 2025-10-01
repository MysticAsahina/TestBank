import { StyleSheet } from "react-native";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 25,
    marginBottom: 20,
    textAlign: "center",
    fontWeight: "bold",
  },
  subtitle:{
    fontSize: 20,
    marginBottom: 10,
    textAlign: "left",
    fontWeight: "bold",
 
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 5,
    padding: 15,
    marginBottom: 10,
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  LoginContainer: {
    alignContent: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#000",
    borderStyle: "solid",
    padding: 20,
    marginBottom: 20,
    width: "100%",
    maxWidth: 500,
    borderRadius: 10,
    height:"100%",
  },
  TemporaryContainer: {
    alignContent: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#000",
    borderStyle: "solid",
    padding: 20,
    marginBottom: 20,
    width: "100%",
    maxWidth: 500,
    borderRadius: 10,
    height:"100%",
  },
  LoginButton: {
    backgroundColor: "#ffffffff",   
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 8,
    alignItems: "center",
    marginVertical: 10,
    borderWidth: 1,
    borderColor: "#008cffff",
    borderStyle: "solid",
  },
  RegisterButton: {
    backgroundColor: "#ffffffff",   
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 8,
    alignItems: "center",
    marginVertical: 10,
    borderWidth: 1,
    borderColor: "#008cffff",
    borderStyle: "solid",
  },
  Button:{
    backgroundColor: "#ffffffff",   
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 8,
    alignItems: "center",
    marginVertical: 10,
    borderWidth: 1,
    borderColor: "#008cffff",
    borderStyle: "solid",
  },
  SelectContainer: {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  width: "100%",
  marginBottom: 15,
  paddingLeft:10
  },
  dropdownContainer: {
    borderWidth: 1,
    borderColor: "#ccc",
    width: "65%",
    borderRadius: 5,
  },


});

export default styles;
