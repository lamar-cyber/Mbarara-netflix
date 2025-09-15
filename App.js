import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, Button, FlatList, Image, StyleSheet, TouchableOpacity
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Linking from 'expo-linking';
import * as Notifications from 'expo-notifications';

const API_KEY = 'YOUR_TMDB_API_KEY';
const URL = `https://api.themoviedb.org/3/movie/popular?api_key=${API_KEY}`;
const validCodes = ['MOVIEGOLD2025', 'SILVERPASS'];

export default function App() {
  const [movies, setMovies] = useState([]);
  const [query, setQuery] = useState('');
  const [favorites, setFavorites] = useState([]);
  const [tier, setTier] = useState('free');
  const [code, setCode] = useState('');
  const [darkMode, setDarkMode] = useState(true);
  const [message, setMessage] = useState('');
  const [chat, setChat] = useState([]);
  const [trialStart, setTrialStart] = useState(null);

  useEffect(() => {
    fetch(URL)
      .then(res => res.json())
      .then(data => {
        setMovies(data.results);
        AsyncStorage.setItem('cachedMovies', JSON.stringify(data.results));
      })
      .catch(async () => {
        const cached = await AsyncStorage.getItem('cachedMovies');
        if (cached) setMovies(JSON.parse(cached));
      });

    AsyncStorage.getItem('chatLog').then(data => {
      if (data) setChat(JSON.parse(data));
    });

    AsyncStorage.getItem('trialStart').then(date => {
      if (date) setTrialStart(date);
    });
  }, []);

  const searchMovies = () => {
    fetch(`https://api.themoviedb.org/3/search/movie?api_key=${API_KEY}&query=${query}`)
      .then(res => res.json())
      .then(data => setMovies(data.results));
  };

  const getTrailer = async (id) => {
    const res = await fetch(`https://api.themoviedb.org/3/movie/${id}/videos?api_key=${API_KEY}`);
    const data = await res.json();
    const trailer = data.results.find(v => v.type === 'Trailer' && v.site === 'YouTube');
    if (trailer) Linking.openURL(`https://www.youtube.com/watch?v=${trailer.key}`);
  };

  const saveFavorite = async (movie) => {
    const updated = [...favorites, movie];
    setFavorites(updated);
    await AsyncStorage.setItem('favorites', JSON.stringify(updated));
  };

  const rateMovie = async (id, rating) => {
    await AsyncStorage.setItem(`rating-${id}`, rating.toString());
  };

  const redeemCode = () => {
    if (validCodes.includes(code)) {
      const newTier = code.includes('GOLD') ? 'gold' : 'silver';
      setTier(newTier);
      alert(`🎉 Unlocked ${newTier.toUpperCase()} Tier!`);
    } else {
      alert('❌ Invalid Code');
    }
  };

  const startTrial = async () => {
    const now = new Date().toISOString();
    await AsyncStorage.setItem('trialStart', now);
    setTrialStart(now);
  };

  const isTrialActive = () => {
    if (!trialStart) return false;
    const now = new Date();
    const start = new Date(trialStart);
    return (now - start) / (1000 * 60 * 60 * 24) <= 7;
  };

  const sendMessage = async () => {
    const newChat = [...chat, message];
    setChat(newChat);
    await AsyncStorage.setItem('chatLog', JSON.stringify(newChat));
    setMessage('');
  };

  const scheduleReminder = async () => {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '🎥 Movie Night!',
        body: 'Don’t forget to check out today’s top picks!',
      },
      trigger: { seconds: 10 },
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: darkMode ? '#000' : '#fff' }]}>
      <Text style={[styles.title, { color: darkMode ? '#fff' : '#000' }]}>🎬 Mbarara Movie App</Text>

      <TextInput style={styles.input} placeholder="Search movies..." value={query} onChangeText={setQuery} onSubmitEditing={searchMovies} />
      <Button title="Toggle Dark Mode" onPress={() => setDarkMode(!darkMode)} />
      <Button title="Start Free Trial" onPress={startTrial} />
      <Text>{isTrialActive() ? '✅ Trial Active' : '⏳ No Trial'}</Text>

      <TextInput placeholder="Enter gift code" value={code} onChangeText={setCode} style={styles.input} />
      <Button title="Redeem Code" onPress={redeemCode} />
      <Text>Tier: {tier.toUpperCase()}</Text>

      <FlatList
        data={movies}
        keyExtractor={item => item.id.toString()}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Image source={{ uri: `https://image.tmdb.org/t/p/w500${item.poster_path}` }} style={styles.poster} />
            <Text style={{ color: darkMode ? '#fff' : '#000' }}>{item.title}</Text>
            <Button title="Watch Trailer" onPress={() => getTrailer(item.id)} />
            <Button title="❤️ Save" onPress={() => saveFavorite(item)} />
            <TouchableOpacity onPress={() => rateMovie(item.id, 5)}>
              <Text style={{ color: 'gold' }}>⭐ Rate 5</Text>
            </TouchableOpacity>
          </View>
        )}
      />

      <TextInput value={message} onChangeText={setMessage} placeholder="Chat..." style={styles.input} />
      <Button title="Send Message" onPress={sendMessage} />
      <FlatList data={chat} renderItem={({ item }) => <Text style={{ color: darkMode ? '#fff' : '#000' }}>{item}</Text>} />

      <Button title="🔔 Schedule Reminder" onPress={scheduleReminder} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 10 },
  title: { fontSize: 24, marginBottom: 10 },
  input: { backgroundColor: '#eee', padding: 10, marginVertical: 5 },
  card: { marginBottom: 20 },
  poster: { width: '100%', height: 300, borderRadius: 10 }
});
