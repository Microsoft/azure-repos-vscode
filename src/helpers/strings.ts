/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/
"use strict";

/* tslint:disable:variable-name */
export class Strings {
    static ViewYourPinnedQuery: string = "View your pinned work item query results.";

    static BrowseYourPullRequests: string = "Browse your pull requests.";
    static BrowseAdditionalWorkItems: string = "Browse additional work items...";
    static BrowseAdditionalWorkItemsDescription: string = "Choose this item to see all query results in your web browser";
    static NavigateToBuildSummary: string = "Click to view build";
    static NavigateToTeamServicesWebSite: string = "Click to view your team project website.";
    static NoAccessTokenFound: string = "A personal access token for this Team Services repository was not found in your local user settings.";
    static NoAccessTokenLearnMoreRunLogin: string = "You are not connected to Team Services. Select 'Learn more...' and then run the 'team login' command.";
    static NoAccessTokenRunLogin: string = "You are not connected to Team Services. Please run the 'team login' command.";
    static NoTeamServerCredentialsRunLogin: string = "You are not connected to a Team Foundation Server.  Please run the 'team login' command.";
    static NoBuildsFound: string = "No builds were found for this repository and branch. Click to view your team project's build definitions page.";
    static NoGitRepoInformation: string = "No Team Services or Team Foundation Server Git repository configuration was found.  Ensure you've opened a folder that contains a Git repository.";
    static NoSourceFileForBlame: string = "A source file must be opened to show blame information.";

    static SendAFrown: string = "Send a Frown";
    static SendASmile: string = "Send a Smile";
    static SendEmailPrompt: string = "(Optional) Provide your email address";
    static SendFeedback: string = "Send us feedback!";
    static SendFeedbackPrompt: string = "Enter your feedback here (1000 char limit)";
    static NoFeedbackSent: string = "No feedback was sent.";
    static ThanksForFeedback: string = "Thanks for sending feedback!";
    static LearnMore: string = "Learn more...";

    static ChoosePullRequest: string = "Choose a pull request";
    static ChooseWorkItem: string = "Choose a work item";
    static ChooseWorkItemQuery: string = "Choose a work item query";
    static ChooseWorkItemType: string = "Choose a work item type";
    static ClickToRetryConnection: string = "Click to retry.";

    static ProvideAccessToken: string = "Provide the personal access token for your account";
    static ProvidePassword: string = "Provide the password for username";
    static ProvideUsername: string = "Provide the username for server";

    static UnsupportedServerVersion: string = "The Team Services extension only supports TFS version 2015 Update 2 or later. Please verify your TFS server version.";
    static UnableToRemoveCredentials: string = "Unable to remove credentials for this host.  You may need to remove them manually.  Host: ";
    static UnableToStoreCredentials: string = "Unable to store credentials for this host.  Host: ";

    //Status codes
    static StatusCode401: string = "Unauthorized. Check your authentication credentials and try again.";
    static StatusCodeOffline: string = "It appears Visual Studio Code is offline.  Please connect and try again.";
}
/* tslint:enable:variable-name */
