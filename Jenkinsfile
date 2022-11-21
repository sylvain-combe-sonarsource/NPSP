node {
  stage('SCM') {
    checkout scm
  }
  stage('SonarQube Analysis') {
    def scannerHome = tool 'SonarScanner';
    withSonarQubeEnv('SYCOLATEST') {
      sh "${scannerHome}/bin/sonar-scanner -D"sonar.projectKey=Github-SalesforceFoundation-NPSP"
    }
  }
}
