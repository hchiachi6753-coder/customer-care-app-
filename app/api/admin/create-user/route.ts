import { NextRequest, NextResponse } from 'next/server';
import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin SDK
function initializeFirebaseAdmin() {
  if (getApps().length === 0) {
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
    
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: privateKey,
      }),
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    initializeFirebaseAdmin();
    
    const { email, password, name, role, teamId } = await request.json();
    
    // Validate required fields
    if (!email || !password || !name || !role || !teamId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Step 1: Create user in Firebase Auth
    const userRecord = await getAuth().createUser({
      email,
      password,
      displayName: name,
    });
    
    // Step 2: Create user document in Firestore
    await getFirestore()
      .collection('users')
      .doc(userRecord.uid)
      .set({
        uid: userRecord.uid,
        email,
        name,
        role,
        teamId,
        createdAt: new Date().toISOString(),
      });
    
    return NextResponse.json({
      success: true,
      uid: userRecord.uid,
      message: `User ${name} created successfully`,
    });
    
  } catch (error: any) {
    console.error('Error creating user:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to create user',
        details: error.message 
      },
      { status: 500 }
    );
  }
}