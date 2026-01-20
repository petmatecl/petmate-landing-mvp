import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import mermaid from 'mermaid';
import { useRouter } from 'next/router';

// Initialize Mermaid
mermaid.initialize({
    startOnLoad: false,
    theme: 'base',
    themeVariables: {
        primaryColor: '#ecfdf5', // emerald-50
        primaryTextColor: '#064e3b', // emerald-900
        primaryBorderColor: '#10b981', // emerald-500
        lineColor: '#6b7280', // gray-500
        secondaryColor: '#fef2f2', // red-50
        tertiaryColor: '#f0f9ff', // sky-50
    },
    securityLevel: 'loose',
});

// Diagram Definitions (Copied from user_flows.md)
// In a real app we might fetch this from the md file, but hardcoding for simplicity here.
const diagrams = [
    {
        title: "1. Authentication Flow",
        description: "Includes Email/Password, Google, and LinkedIn login paths.",
        code: `graph TD
    A[User Arrives] --> B{Has Account?}
    B -- Yes --> C[Login Page]
    B -- No --> D[Register Page]

    C --> E{Auth Method}
    D --> E

    E -- Email/Pass --> F[Supabase Auth]
    E -- Google --> G[Google OAuth]
    E -- LinkedIn --> H[LinkedIn OAuth]

    F --> I{Success?}
    G --> I
    H --> I

    I -- Yes --> J[Redirect to Dashboard/Home]
    I -- No --> K[Show Error Message]`
    },
    {
        title: "2. Booking Prerequisites (Onboarding Check)",
        description: "Ensures users have necessary data (Pets, Address) before initiating a request.",
        code: `graph TD
    A[User Clicks 'Contact/Book'] --> B{Is Logged In?}
    B -- No --> C[Login/Register] --> B
    B -- Yes --> D{Has Pets?}
    
    D -- No --> E[Redirect to 'Add Pet']
    E --> F[User Creates Pet]
    F --> G[Redirect back to Booking]
    G --> A
    
    D -- Yes --> H{Has Address?}
    H -- No --> I[Redirect to 'Profile/Address']
    I --> J[User Adds Address]
    J --> K[Redirect back to Booking]
    K --> A
    
    H -- Yes --> L[Open Booking Modal]`
    },
    {
        title: "3. End-to-End Interaction (Ideal Flow)",
        description: "Complete lifecycle including Pay, Cancel, and Rejection paths.",
        code: `sequenceDiagram
    actor Owner as Pet Owner
    participant System
    actor Sitter

    Owner->>System: Post Request (Trip)
    System->>Sitter: Notify Recommended Sitters
    
    alt No Response / Timeout
        System->>Owner: Notify "No sitters found"
        System->>Owner: Suggest "Expand Search"
    else Sitter Responds
        Sitter->>System: View Request
        
        alt Sitter Applied
            Sitter->>System: Apply (Postular)
            System->>Owner: Notify "New Application"
            
            opt Chat Negotiation
                Owner->>Sitter: Message
                Sitter->>Owner: Response
            end
            
            alt Owner Accepts
                Owner->>System: Click "Accept"
                System->>Owner: Redirect to Checkout (MercadoPago)
                Owner->>System: Complete Payment
                System->>System: Hold Funds (Escrow)
                System->>System: Update Trip -> Scheduled
                System->>Sitter: Notify "Confirmed & Paid"
                System->>Owner: Send Service Sheet
                
                opt Cancellation (Pre-Service)
                    Owner->>System: Cancel Trip
                    System->>Owner: Refund (Policy dependent)
                    System->>Sitter: Notify Cancellation
                end
                
            else Owner Rejects
                Owner->>System: Reject Application
                System->>Sitter: Notify Rejection
            end
            
        else Sitter Not Interested
            Sitter->>System: Ignore/Hide
        end
    end`
    },
    {
        title: "4. Sitter Application Flow (Sitter View)",
        description: "How sitters find and apply to jobs.",
        code: `graph TD
    A[Sitter Dashboard] --> B["Explore Requests (Tab)"]
    B --> C[View Open Care Requests]
    C --> D[Select Request]
    D --> E[View Details]
    
    E --> F{"Interested?"}
    F -- Yes --> G[Click 'Apply']
    G --> H[Create Postulation]
    H --> I[Notify Pet Owner]
    
    F -- No --> J[Ignore/Back]`
    },
    {
        title: "5. Dashboard Management",
        description: "High-level dashboard structure based on user role.",
        code: `graph TD
    A[Dashboard] --> B{User Type}
    
    B -- Pet Owner --> C[My Pets]
    C --> C1[Add/Edit Pet]
    
    B -- Sitter --> D[Sitter Profile]
    D --> D1[Edit Services]
    D --> D2[Edit Gallery]
    D --> D3[Edit Availability]
    
    B -- Both --> E[Messages]
    B -- Both --> F[My Trips/Bookings]`
    },
    {
        title: "6. Post-Service Review Flow",
        description: "Email-triggered review process.",
        code: `graph LR
    A[Trip Ends] --> B(System Wait 1 Day)
    B --> C[Send Review Email]
    C --> D[User Clicks Link]
    D --> E[Review Form]
    E --> F[Submit Star Rating]
    F --> G[Update Sitter DB Stats]
    G --> H[Show on Public Profile]`
    }
];

export default function UserFlowsDocs() {
    const router = useRouter();

    useEffect(() => {
        // Run mermaid diagram generation
        mermaid.run({
            querySelector: '.mermaid',
        });
    }, []);

    return (
        <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
            <Head>
                <title>User Flows Documentation | Pawnecta</title>
                <meta name="robots" content="noindex" />
            </Head>

            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold text-slate-900">Pawnecta User Flows</h1>
                    <button
                        onClick={() => router.push('/')}
                        className="text-emerald-600 hover:text-emerald-700 font-medium"
                    >
                        &larr; Back to App
                    </button>
                </div>

                <p className="text-slate-600 mb-12 max-w-3xl">
                    Visual documentation of key user journeys within the platform.
                    Generated dynamically using Mermaid.js.
                </p>

                <div className="space-y-16">
                    {diagrams.map((diagram, index) => (
                        <div key={index} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                                <h2 className="text-xl font-semibold text-slate-800">{diagram.title}</h2>
                                <p className="text-sm text-slate-500 mt-1">{diagram.description}</p>
                            </div>
                            <div className="p-6 flex justify-center bg-white overflow-x-auto">
                                <div className="mermaid">
                                    {diagram.code}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

