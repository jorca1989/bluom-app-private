<ScrollView contentContainerStyle={styles.scrollContent}>
  {/* AI VALUE BANNER */}
  <LinearGradient colors={['#0f172a', '#1e293b']} style={styles.aiBanner}>
    <View style={{ flex: 1 }}>
      <Text style={styles.aiBannerTitle}>✨ Weekly AI Blueprint</Text>
      <Text style={styles.aiBannerSub}>Your plan adapts every Sunday based on your latest biometric data.</Text>
    </View>
  </LinearGradient>

  <View style={styles.hubGrid}>
    <HubCard
      title="Nutrition"
      subtitle="AI Meal Plan"
      icon="restaurant" color="#f97316"
      onPress={() => router.push('/nutrition-hub')}
      data={nutritionPlan ? <Text>{Math.round(nutritionPlan.calorieTarget)} kcal</Text> : <Text>Generating...</Text>}
    />
    <HubCard
      title="Fitness"
      subtitle="AI Routines"
      icon="barbell" color="#ef4444"
      onPress={() => router.push('/(tabs)/move')}
      data={fitnessPlan ? <Text>{fitnessPlan.workoutSplit}</Text> : <Text>Generating...</Text>}
    />
    <HubCard
      title="Wellness"
      subtitle="AI Protocols"
      icon="leaf" color="#10b981"
      onPress={() => router.push('/(tabs)/wellness')}
      data={wellnessPlan ? <Text>Syncing...</Text> : <Text>Generating...</Text>}
    />
  </View>
</ScrollView>