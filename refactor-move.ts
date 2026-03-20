const fs = require('fs');
const path = require('path');

const targetFile = path.join(__dirname, 'app', '(tabs)', 'move.tsx');
let content = fs.readFileSync(targetFile, 'utf8');

// 1. Remove old unused AIRoutineModal import
content = content.replace("import AIRoutineModal from '@/components/AIRoutineModal';\n", "");

// 2. Add New Component Imports
const newImports = `
import CurrentProgramCard from '@/components/move/CurrentProgramCard';
import WorkoutDayCard from '@/components/move/WorkoutDayCard';
import MoveQuickActions from '@/components/move/MoveQuickActions';
import MoveInsights from '@/components/move/MoveInsights';
import ActiveWorkoutModal, { ActiveExercise } from '@/components/move/modals/ActiveWorkoutModal';
import WorkoutDetailModal from '@/components/move/modals/WorkoutDetailModal';
import ExerciseSearchModal, { ExerciseLibraryItem as ESearchItem } from '@/components/move/modals/ExerciseSearchModal';
import ExerciseDetailModal from '@/components/move/modals/ExerciseDetailModal';
`;
content = content.replace("import { useResponsive } from '@/utils/responsive';", "import { useResponsive } from '@/utils/responsive';" + newImports);

// 3. Add UI Modal States
const oldStates = `  const [showDropdown, setShowDropdown] = useState(false);
  const [showWorkoutModal, setShowWorkoutModal] = useState(false);
  const [showExerciseSearch, setShowExerciseSearch] = useState(false);
  const [showStepsModal, setShowStepsModal] = useState(false);
  const [showCustomExercise, setShowCustomExercise] = useState(false);
  const [showAllActivities, setShowAllActivities] = useState(false);`;

const newStates = `  const [showDropdown, setShowDropdown] = useState(false);
  const [showActiveWorkout, setShowActiveWorkout] = useState(false);
  const [showWorkoutDetail, setShowWorkoutDetail] = useState(false);
  const [showExerciseSearch, setShowExerciseSearch] = useState(false);
  const [showExerciseDetail, setShowExerciseDetail] = useState(false);
  const [selectedExerciseForDetail, setSelectedExerciseForDetail] = useState<any>(null);
  const [showStepsModal, setShowStepsModal] = useState(false);
  const [showCustomExercise, setShowCustomExercise] = useState(false);
  const [showWorkoutModal, setShowWorkoutModal] = useState(false);
  const [showAllActivities, setShowAllActivities] = useState(false);
  const dummyExercises = [{ id: '1', name: 'Barbell Bench Press', sets: [{id:'1a', weight:'', reps:'', completed:false}] }];`;

content = content.replace(oldStates, newStates);

// 4. Update the render output body
const startIndex = content.indexOf('          {/* Header */}');
const endIndex = content.indexOf('      <AIRoutineModal');

if (startIndex !== -1 && endIndex !== -1) {
  const newUI = `
          {/* Header */}
          <View style={[styles.header, { paddingTop: Math.max(insets.top, 12) + 22 }]}>
            <View style={styles.headerContent}>
              <View style={styles.headerTextContainer}>
                <Text style={styles.title}>Move</Text>
                <Text style={styles.subtitle}>Track your workouts and activity</Text>
              </View>
            </View>
          </View>

          {/* Current Program */}
          <CurrentProgramCard
            programName="Foundation Mass Builder"
            level="Beginner"
            daysPerWeek={3}
            currentWeek={1}
            totalWeeks={6}
            progressPercent={15}
            onInfoPress={() => {}}
            onWorkoutsPress={() => {}}
            onChangePress={() => {}}
          />

          {/* Weekly Workouts Horizontal Scroll */}
          <View style={{ marginTop: 32, marginBottom: 8, paddingHorizontal: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#1e293b' }}>Workouts</Text>
            <View style={{ flexDirection: 'row', gap: 12 }}>
               <Ionicons name="chevron-back" size={20} color="#94a3b8" />
               <Ionicons name="chevron-forward" size={20} color="#0f172a" />
            </View>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20 }}>
             <WorkoutDayCard 
                dayTitle="Leg Day" 
                muscleGroups="Quads, Hamstrings, Glutes, Calves, Abs" 
                exercises={[
                  { id: '1', name: 'Squat', thumbnailUrl: 'https://images.unsplash.com/photo-1574681533083-bf41eb47b2c0?auto=format&fit=crop&q=80&w=200' },
                  { id: '2', name: 'Leg Press' },
                  { id: '3', name: 'Calf Raise' },
                  { id: '4', name: 'Curl' },
                  { id: '5', name: 'Crunch' },
                ]}
                isUpNext={true}
                onSkip={() => {}}
                onStartWorkout={() => setShowActiveWorkout(true)}
                onViewWorkout={() => setShowWorkoutDetail(true)}
             />
             <WorkoutDayCard 
                dayTitle="Push Day" 
                muscleGroups="Chest, Front Delts, Triceps" 
                exercises={[
                  { id: '1', name: 'Bench Press' },
                  { id: '2', name: 'Incline Press' },
                ]}
                isUpNext={false}
                onStartWorkout={() => setShowActiveWorkout(true)}
                onViewWorkout={() => setShowWorkoutDetail(true)}
             />
          </ScrollView>

          {/* Activity Summary Layout Simplified */}
          <View style={[styles.activitySummary, { marginTop: 16 }, isTablet && { justifyContent: 'space-between' }]}>
            <View style={[styles.summaryCard, { width: kpiCardWidth(48, 16), padding: isSmallScreen ? 12 : 16 }]}>
              <View style={[styles.summaryIconContainer, { backgroundColor: '#dbeafe' }]}><Ionicons name="barbell" size={24} color="#2563eb" /></View>
              <Text style={styles.summaryLabel} numberOfLines={1}>Workouts</Text>
              <Text style={styles.summaryValue} numberOfLines={1}>{todayTotals.workouts}</Text>
            </View>
            <View style={[styles.summaryCard, { width: kpiCardWidth(48, 16), padding: isSmallScreen ? 12 : 16 }]}>
              <View style={[styles.summaryIconContainer, { backgroundColor: '#dbeafe' }]}><Ionicons name="time" size={24} color="#2563eb" /></View>
              <Text style={styles.summaryLabel} numberOfLines={1}>Minutes</Text>
              <Text style={styles.summaryValue} numberOfLines={1}>{todayTotals.minutes}</Text>
            </View>
          </View>

          {/* Move Quick Actions & Insights */}
          <MoveQuickActions 
             onAddWorkout={() => setShowActiveWorkout(true)}
             onBrowseLibrary={() => setShowExerciseSearch(true)}
             onAddSteps={() => setShowStepsModal(true)}
             onCustomExercise={() => setShowCustomExercise(true)}
          />

          <MoveInsights isPro={false} onUpgradePress={() => {}} />

        </View>{/* end tablet maxWidth wrapper */}
      </ScrollView>

      <ActiveWorkoutModal 
        visible={showActiveWorkout}
        exercises={dummyExercises}
        onClose={() => setShowActiveWorkout(false)}
        onFinishWorkout={(time, vol, sets, ex) => {
           setShowActiveWorkout(false);
           // Simple trigger
        }}
      />
      
      <WorkoutDetailModal 
        visible={showWorkoutDetail}
        dayTitle="Push Day"
        muscleGroups="Chest, Shoulders, Triceps"
        exercises={[
          { id: '1', name: 'Barbell Bench Press', primaryMuscle: 'Chest', equipment: 'Barbell', sets: 3, reps: '8-10' },
          { id: '2', name: 'Incline Machine Chest Press', primaryMuscle: 'Chest', equipment: 'Machine', sets: 3, reps: 10 },
        ]}
        onClose={() => setShowWorkoutDetail(false)}
      />

      <ExerciseSearchModal 
        visible={showExerciseSearch}
        searchResults={searchResults}
        loading={searchLoading}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onExerciseSelect={(ex) => {
           setSelectedExerciseForDetail(ex);
           setShowExerciseDetail(true);
        }}
        onClose={() => setShowExerciseSearch(false)}
      />

      <ExerciseDetailModal 
        visible={showExerciseDetail}
        exercise={selectedExerciseForDetail}
        isPro={false}
        onClose={() => setShowExerciseDetail(false)}
        onUpgradePress={() => {}}
      />

      {/* Legacy Modals below */}
      `;
  content = content.substring(0, startIndex) + newUI + content.substring(endIndex + 21); // +21 removes `<AIRoutineModal ... />` roughly
}

fs.writeFileSync(targetFile, content);
console.log('Successfully refactored move.tsx');
