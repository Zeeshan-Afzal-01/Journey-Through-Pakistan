import { StatusBar } from 'expo-status-bar';
import { Text, StyleSheet, View, Pressable } from 'react-native';

export default function App() {
  return (
    <View style={styles.container}>
      
      {/* Top Title */}
      <View style={styles.header}>
        <Text style={styles.title}>Welcome to Home Page</Text>
      </View>

      {/* Main Content (Buttons) */}
      <View style={styles.content}>
        <Pressable
          style={styles.button}
          onPress={() => alert("login page")}
        >
          <Text style={styles.buttonText}>Login</Text>
        </Pressable>

        <Pressable
          style={styles.button}
          onPress={() => alert("register page")}
        >
          <Text style={styles.buttonText}>Register</Text>
        </Pressable>
      </View>

      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fcfcfcff',
  },
  header: {
    marginTop: 60, // space from top
    alignItems: 'center',
  },
  title: {
    fontSize: 30,
    fontWeight: "bold",
  },
  content: {
    flex: 1, // take remaining space
    alignItems: 'center',
    justifyContent: 'center', // center buttons
  },
  button: {
    borderWidth: 2,
    margin: 10,
    borderColor: '#60cfe8ff',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 25,
    backgroundColor: '#29cee0ff',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
