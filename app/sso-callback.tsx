import React from 'react';
import { View, Text } from 'react-native';

// Defining it as a named constant first helps React keep track of the metadata
const SSOCallbackPage = () => {
    return (
        <View style={{ flex: 1, backgroundColor: '#ffffff', justifyContent: 'center', alignItems: 'center' }}>
            <Text>Processing login...</Text>
        </View>
    );
};

// Explicitly set the displayName to satisfy the CSS Interop library
SSOCallbackPage.displayName = 'SSOCallbackPage';

export default SSOCallbackPage;